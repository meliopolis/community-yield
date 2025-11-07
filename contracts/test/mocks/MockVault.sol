// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

contract MockVault {
    MockERC20 public immutable asset;
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    
    constructor(
        MockERC20 _asset,
        string memory _name,
        string memory _symbol
    ) {
        asset = _asset;
        name = _name;
        symbol = _symbol;
    }
    
    function generateYield(uint256 amount) external {
        asset.mint(address(this), amount);
    }
    
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }
    
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        require(assets > 0, "Zero assets");
        
        shares = convertToShares(assets);
        
        asset.transferFrom(msg.sender, address(this), assets);
        
        totalSupply += shares;
        balanceOf[receiver] += shares;
        
        return shares;
    }
    
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets) {
        require(balanceOf[owner] >= shares, "Insufficient shares");
        
        if (msg.sender != owner) {
            revert("Not authorized");
        }
        
        assets = convertToAssets(shares);
        
        balanceOf[owner] -= shares;
        totalSupply -= shares;
        
        asset.transfer(receiver, assets);
        
        return assets;
    }
    
    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply;
        return supply == 0 ? assets : (assets * supply) / totalAssets();
    }
    
    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply;
        return supply == 0 ? shares : (shares * totalAssets()) / supply;
    }
}