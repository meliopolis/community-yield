// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IERC20.sol";
import "./interfaces/IERC4626.sol";

contract YieldRedirector {

    struct Position {
        uint256 shares;
        uint256 depositedAssets;
        address beneficiary;
        address vault;
        address depositor;
    }

    struct VaultInfo {
        address vault;
        address asset;
    }

    mapping(bytes32 => Position) public positions;
    mapping(address => VaultInfo) public vaultInfo;
    mapping(address => mapping(address => uint256)) public depositorPositionCount;
    mapping(address => mapping(address => mapping(uint256 => bytes32))) public depositorPositionIds;
    
    // Track positions where an address is the beneficiary
    mapping(address => bytes32[]) public beneficiaryPositions;
    
    event Deposited(
        address indexed depositor,
        address indexed vault,
        address indexed beneficiary,
        bytes32 positionId,
        uint256 assets,
        uint256 shares
    );
    
    event YieldClaimed(
        address indexed beneficiary,
        address indexed vault,
        address indexed depositor,
        bytes32 positionId,
        uint256 amount
    );
    
    event BeneficiaryUpdated(
        address indexed depositor,
        address indexed vault,
        address indexed newBeneficiary,
        bytes32 positionId
    );
    
    event Withdrawn(
        address indexed depositor,
        address indexed vault,
        bytes32 positionId,
        uint256 assets,
        uint256 shares
    );

    error InvalidVault();
    error InvalidBeneficiary();
    error InsufficientShares();
    error NoYieldToClaim();
    error TransferFailed();
    error PositionNotFound();
    error VaultAlreadyAdded();
    error NotERC4626Compliant();
    error InvalidAsset();
    error VaultMathInconsistent();

    modifier onlyPositionOwner(bytes32 _positionId) {
        Position storage position = positions[_positionId];
        if (position.depositor == address(0)) revert PositionNotFound();
        require(msg.sender == position.depositor, "Not position owner");
        _;
    }

    modifier onlyBeneficiary(bytes32 _positionId) {
        Position storage position = positions[_positionId];
        if (position.depositor == address(0)) revert PositionNotFound();
        require(msg.sender == position.beneficiary, "Not beneficiary");
        _;
    }


    function _generatePositionId(
        address _depositor,
        address _vault,
        uint256 _index
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_depositor, _vault, _index));
    }

    function getPositionIds(address _depositor, address _vault) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        uint256 count = depositorPositionCount[_depositor][_vault];
        bytes32[] memory ids = new bytes32[](count);
        
        for (uint256 i = 0; i < count; i++) {
            ids[i] = depositorPositionIds[_depositor][_vault][i];
        }
        
        return ids;
    }
    
    function getClaimableYield(bytes32 _positionId) public view returns (uint256) {
        Position memory position = positions[_positionId];
        if (position.shares == 0 || position.depositor == address(0)) return 0;
        
        IERC4626 vault = IERC4626(position.vault);
        uint256 currentValue = vault.convertToAssets(position.shares);
        
        return currentValue > position.depositedAssets 
            ? currentValue - position.depositedAssets 
            : 0;
    }

    function _validateAndAddVault(address _vault) internal {
        if (_vault == address(0)) revert InvalidVault();
        if (_vault.code.length == 0) revert InvalidVault();
        
        // Skip if vault already exists
        if (vaultInfo[_vault].vault != address(0)) return;
        
        IERC4626 vault = IERC4626(_vault);
        address asset;
        
        // Verify ERC4626 compliance
        try vault.asset() returns (address _asset) {
            asset = _asset;
            if (asset == address(0) || asset.code.length == 0) revert InvalidAsset();
        } catch {
            revert NotERC4626Compliant();
        }
        
        // Verify asset is ERC20
        try IERC20(asset).totalSupply() returns (uint256) {
            // Asset appears to be ERC20
        } catch {
            revert InvalidAsset();
        }
        
        // Test vault math consistency with a reasonable test amount
        uint256 testAmount = 1e18; // 1 token with 18 decimals
        try vault.convertToShares(testAmount) returns (uint256 shares) {
            if (shares == 0) revert VaultMathInconsistent();
            
            try vault.convertToAssets(shares) returns (uint256 backToAssets) {
                if (backToAssets == 0) revert VaultMathInconsistent();
                
                // Allow for reasonable rounding (±5%)
                uint256 minExpected = testAmount * 95 / 100;
                uint256 maxExpected = testAmount * 105 / 100;
                
                if (backToAssets < minExpected || backToAssets > maxExpected) {
                    revert VaultMathInconsistent();
                }
            } catch {
                revert VaultMathInconsistent();
            }
        } catch {
            revert VaultMathInconsistent();
        }
        
        // Verify totalAssets function exists and works
        try vault.totalAssets() returns (uint256) {
            // Function exists and callable
        } catch {
            revert NotERC4626Compliant();
        }
        
        // All checks passed - add the vault
        vaultInfo[_vault] = VaultInfo({
            vault: _vault,
            asset: asset
        });
    }

    function addVault(address _vault) external {
        if (vaultInfo[_vault].vault != address(0)) revert VaultAlreadyAdded();
        _validateAndAddVault(_vault);
    }

    function deposit(
        address _vault,
        uint256 _assets,
        address _beneficiary
    ) external returns (uint256 shares, bytes32 positionId) {
        if (_beneficiary == address(0)) revert InvalidBeneficiary();
        
        // Auto-add vault if it doesn't exist
        _validateAndAddVault(_vault);
        
        IERC4626 vault = IERC4626(_vault);
        IERC20 asset = IERC20(vault.asset());
        
        require(asset.transferFrom(msg.sender, address(this), _assets), "Transfer failed");
        require(asset.approve(_vault, _assets), "Approve failed");
        
        shares = vault.deposit(_assets, address(this));
        
        uint256 positionIndex = depositorPositionCount[msg.sender][_vault];
        positionId = _generatePositionId(msg.sender, _vault, positionIndex);
        
        Position storage position = positions[positionId];
        position.shares = shares;
        position.depositedAssets = _assets;
        position.beneficiary = _beneficiary;
        position.vault = _vault;
        position.depositor = msg.sender;
        
        depositorPositionIds[msg.sender][_vault][positionIndex] = positionId;
        depositorPositionCount[msg.sender][_vault]++;
        
        // Track this position for the beneficiary
        beneficiaryPositions[_beneficiary].push(positionId);
        
        emit Deposited(msg.sender, _vault, _beneficiary, positionId, _assets, shares);
    }

    function updateBeneficiary(bytes32 _positionId, address _newBeneficiary) 
        external 
        onlyPositionOwner(_positionId) 
    {
        if (_newBeneficiary == address(0)) revert InvalidBeneficiary();
        
        Position storage position = positions[_positionId];
        position.beneficiary = _newBeneficiary;
        
        emit BeneficiaryUpdated(msg.sender, position.vault, _newBeneficiary, _positionId);
    }

    function claimYield(bytes32 _positionId) 
        external 
        onlyBeneficiary(_positionId) 
    {
        uint256 yield = getClaimableYield(_positionId);
        if (yield == 0) revert NoYieldToClaim();
        
        Position storage position = positions[_positionId];
        IERC4626 vault = IERC4626(position.vault);
        
        uint256 sharesToRedeem = vault.convertToShares(yield);
        if (sharesToRedeem > position.shares) {
            sharesToRedeem = position.shares;
            yield = vault.convertToAssets(sharesToRedeem);
        }
        
        vault.redeem(sharesToRedeem, msg.sender, address(this));
        position.shares -= sharesToRedeem;
        
        emit YieldClaimed(msg.sender, position.vault, position.depositor, _positionId, yield);
    }

    function withdraw(bytes32 _positionId, uint256 _assets) 
        external 
        onlyPositionOwner(_positionId) 
    {
        Position storage position = positions[_positionId];
        IERC4626 vault = IERC4626(position.vault);
        
        uint256 sharesToWithdraw = vault.convertToShares(_assets);
        if (sharesToWithdraw > position.shares) revert InsufficientShares();
        
        uint256 assetsReceived = vault.redeem(sharesToWithdraw, msg.sender, address(this));
        
        position.shares -= sharesToWithdraw;
        position.depositedAssets = position.depositedAssets > _assets 
            ? position.depositedAssets - _assets 
            : 0;
        
        emit Withdrawn(msg.sender, position.vault, _positionId, assetsReceived, sharesToWithdraw);
    }

    function withdrawAll(bytes32 _positionId) 
        external 
        onlyPositionOwner(_positionId) 
    {
        Position storage position = positions[_positionId];
        uint256 shares = position.shares;
        if (shares == 0) revert InsufficientShares();
        
        // Cache values before deletion
        address vaultAddress = position.vault;
        address depositor = position.depositor;
        
        IERC4626 vault = IERC4626(vaultAddress);
        uint256 assetsReceived = vault.redeem(shares, msg.sender, address(this));
        
        // Delete the position
        delete positions[_positionId];
        
        // Note: We intentionally keep depositorPositionIds mapping entries
        // to maintain historical record of position IDs that existed.
        // The position itself is deleted but we can still track that this ID was used.
        
        emit Withdrawn(depositor, vaultAddress, _positionId, assetsReceived, shares);
    }


    function getPosition(bytes32 _positionId) 
        external 
        view 
        returns (
            uint256 shares,
            uint256 depositedAssets,
            address beneficiary,
            address depositor,
            address vault,
            uint256 currentValue,
            uint256 accruedYield
        ) 
    {
        Position memory position = positions[_positionId];
        if (position.depositor == address(0)) {
            return (0, 0, address(0), address(0), address(0), 0, 0);
        }
        
        IERC4626 vaultContract = IERC4626(position.vault);
        
        shares = position.shares;
        depositedAssets = position.depositedAssets;
        beneficiary = position.beneficiary;
        depositor = position.depositor;
        vault = position.vault;
        currentValue = vaultContract.convertToAssets(shares);
        accruedYield = getClaimableYield(_positionId);
    }

    function getDepositorPositions(address _depositor, address _vault) 
        external 
        view 
        returns (bytes32[] memory positionIds) 
    {
        uint256 count = depositorPositionCount[_depositor][_vault];
        positionIds = new bytes32[](count);
        
        for (uint256 i = 0; i < count; i++) {
            positionIds[i] = depositorPositionIds[_depositor][_vault][i];
        }
    }

    function getPositionId(address _depositor, address _vault, uint256 _index) 
        external 
        pure 
        returns (bytes32) 
    {
        return keccak256(abi.encodePacked(_depositor, _vault, _index));
    }
    
    // Get all positions where address is beneficiary
    function getBeneficiaryPositions(address _beneficiary) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return beneficiaryPositions[_beneficiary];
    }
    
    // Get all active positions (with details) for a depositor across all vaults
    function getAllDepositorPositions(address _depositor, address[] memory _vaults)
        external
        view
        returns (
            bytes32[] memory positionIds,
            uint256[] memory shares,
            uint256[] memory depositedAssets,
            address[] memory beneficiaries,
            address[] memory vaults,
            uint256[] memory currentValues,
            uint256[] memory accruedYields
        )
    {
        uint256 totalPositions = 0;
        
        // Count total positions across all vaults
        for (uint256 i = 0; i < _vaults.length; i++) {
            totalPositions += depositorPositionCount[_depositor][_vaults[i]];
        }
        
        // Initialize arrays
        positionIds = new bytes32[](totalPositions);
        shares = new uint256[](totalPositions);
        depositedAssets = new uint256[](totalPositions);
        beneficiaries = new address[](totalPositions);
        vaults = new address[](totalPositions);
        currentValues = new uint256[](totalPositions);
        accruedYields = new uint256[](totalPositions);
        
        uint256 currentIndex = 0;
        
        // Populate arrays with position data
        for (uint256 v = 0; v < _vaults.length; v++) {
            uint256 count = depositorPositionCount[_depositor][_vaults[v]];
            
            for (uint256 i = 0; i < count; i++) {
                bytes32 posId = depositorPositionIds[_depositor][_vaults[v]][i];
                Position memory pos = positions[posId];
                
                // Only include active positions (not deleted)
                if (pos.depositor != address(0) && pos.shares > 0) {
                    positionIds[currentIndex] = posId;
                    shares[currentIndex] = pos.shares;
                    depositedAssets[currentIndex] = pos.depositedAssets;
                    beneficiaries[currentIndex] = pos.beneficiary;
                    vaults[currentIndex] = pos.vault;
                    
                    // Calculate current values
                    IERC4626 vaultContract = IERC4626(pos.vault);
                    currentValues[currentIndex] = vaultContract.convertToAssets(pos.shares);
                    accruedYields[currentIndex] = currentValues[currentIndex] > pos.depositedAssets ? 
                        currentValues[currentIndex] - pos.depositedAssets : 0;
                    
                    currentIndex++;
                }
            }
        }
        
        // Resize arrays to actual size (removing empty slots from deleted positions)
        assembly {
            mstore(positionIds, currentIndex)
            mstore(shares, currentIndex)
            mstore(depositedAssets, currentIndex)
            mstore(beneficiaries, currentIndex)
            mstore(vaults, currentIndex)
            mstore(currentValues, currentIndex)
            mstore(accruedYields, currentIndex)
        }
    }
    
    // Get all active positions where address is beneficiary
    function getAllBeneficiaryPositions(address _beneficiary)
        external
        view
        returns (
            bytes32[] memory positionIds,
            uint256[] memory shares,
            uint256[] memory depositedAssets,
            address[] memory depositors,
            address[] memory vaults,
            uint256[] memory currentValues,
            uint256[] memory accruedYields
        )
    {
        bytes32[] memory allPosIds = beneficiaryPositions[_beneficiary];
        uint256 activeCount = 0;
        
        // Count active positions
        for (uint256 i = 0; i < allPosIds.length; i++) {
            Position memory pos = positions[allPosIds[i]];
            if (pos.depositor != address(0) && pos.shares > 0) {
                activeCount++;
            }
        }
        
        // Initialize arrays
        positionIds = new bytes32[](activeCount);
        shares = new uint256[](activeCount);
        depositedAssets = new uint256[](activeCount);
        depositors = new address[](activeCount);
        vaults = new address[](activeCount);
        currentValues = new uint256[](activeCount);
        accruedYields = new uint256[](activeCount);
        
        uint256 currentIndex = 0;
        
        // Populate arrays with active positions
        for (uint256 i = 0; i < allPosIds.length; i++) {
            Position memory pos = positions[allPosIds[i]];
            
            if (pos.depositor != address(0) && pos.shares > 0) {
                positionIds[currentIndex] = allPosIds[i];
                shares[currentIndex] = pos.shares;
                depositedAssets[currentIndex] = pos.depositedAssets;
                depositors[currentIndex] = pos.depositor;
                vaults[currentIndex] = pos.vault;
                
                // Calculate current values
                IERC4626 vaultContract = IERC4626(pos.vault);
                currentValues[currentIndex] = vaultContract.convertToAssets(pos.shares);
                accruedYields[currentIndex] = currentValues[currentIndex] > pos.depositedAssets ? 
                    currentValues[currentIndex] - pos.depositedAssets : 0;
                
                currentIndex++;
            }
        }
    }

}