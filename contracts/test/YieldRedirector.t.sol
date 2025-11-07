// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/YieldRedirector.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockVault.sol";
import "./mocks/MaliciousVault.sol";

contract YieldRedirectorTest is Test {
    YieldRedirector public redirector;
    MockERC20 public asset;
    MockVault public vault;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charity = address(0x3);
    
    uint256 constant INITIAL_BALANCE = 10000e18;
    uint256 constant DEPOSIT_AMOUNT = 1000e18;
    
    function setUp() public {
        redirector = new YieldRedirector();
        asset = new MockERC20("Test Token", "TEST", 18);
        vault = new MockVault(asset, "Test Vault", "vTEST");
        
        asset.mint(alice, INITIAL_BALANCE);
        asset.mint(bob, INITIAL_BALANCE);
        
        redirector.addVault(address(vault));
        
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(charity, "Charity");
    }
    
    function test_Deposit() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        
        (uint256 shares, bytes32 positionId) = redirector.deposit(
            address(vault),
            DEPOSIT_AMOUNT,
            charity
        );
        
        assertGt(shares, 0, "Should receive shares");
        
        (
            uint256 posShares,
            uint256 deposited,
            address beneficiary,
            address depositor,
            address vaultAddr,
            ,
        ) = redirector.getPosition(positionId);
        
        assertEq(posShares, shares, "Position shares mismatch");
        assertEq(deposited, DEPOSIT_AMOUNT, "Deposited amount mismatch");
        assertEq(beneficiary, charity, "Beneficiary mismatch");
        assertEq(depositor, alice, "Depositor mismatch");
        assertEq(vaultAddr, address(vault), "Vault mismatch");
        vm.stopPrank();
    }
    
    function test_UpdateBeneficiary() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        
        address newBeneficiary = address(0x4);
        redirector.updateBeneficiary(positionId, newBeneficiary);
        
        (,,address beneficiary,,,,) = redirector.getPosition(positionId);
        assertEq(beneficiary, newBeneficiary, "Beneficiary not updated");
        vm.stopPrank();
    }
    
    function test_ClaimYield() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        vault.generateYield(100e18);
        
        uint256 charityBalanceBefore = asset.balanceOf(charity);
        
        vm.prank(charity);
        redirector.claimYield(positionId);
        
        uint256 charityBalanceAfter = asset.balanceOf(charity);
        assertGt(charityBalanceAfter, charityBalanceBefore, "Yield not claimed");
    }
    
    function test_Withdraw() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        
        uint256 withdrawAmount = DEPOSIT_AMOUNT / 2;
        redirector.withdraw(positionId, withdrawAmount);
        
        (uint256 shares, uint256 deposited,,,,,) = redirector.getPosition(positionId);
        assertLt(shares, DEPOSIT_AMOUNT, "Shares not reduced");
        assertEq(deposited, DEPOSIT_AMOUNT - withdrawAmount, "Deposited amount not updated");
        vm.stopPrank();
    }
    
    function test_WithdrawAll() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        
        uint256 balanceBefore = asset.balanceOf(alice);
        redirector.withdrawAll(positionId);
        uint256 balanceAfter = asset.balanceOf(alice);
        
        assertEq(balanceAfter, balanceBefore + DEPOSIT_AMOUNT, "Full withdrawal failed");
        
        (uint256 shares,,,,,,) = redirector.getPosition(positionId);
        assertEq(shares, 0, "Position not cleared");
        vm.stopPrank();
    }
    
    function test_MultipleDepositors() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 alicePositionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        vm.startPrank(bob);
        asset.approve(address(redirector), DEPOSIT_AMOUNT * 2);
        (, bytes32 bobPositionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT * 2, charity);
        vm.stopPrank();
        
        (uint256 aliceShares,,,,,,) = redirector.getPosition(alicePositionId);
        (uint256 bobShares,,,,,,) = redirector.getPosition(bobPositionId);
        
        assertGt(bobShares, aliceShares, "Bob should have more shares");
    }
    
    function testFuzz_Deposit(uint256 amount) public {
        amount = bound(amount, 1e18, INITIAL_BALANCE);
        
        vm.startPrank(alice);
        asset.approve(address(redirector), amount);
        
        (uint256 shares,) = redirector.deposit(
            address(vault),
            amount,
            charity
        );
        
        assertGt(shares, 0, "Should receive shares");
        vm.stopPrank();
    }
    
    function test_RevertInvalidVault() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        
        vm.expectRevert(YieldRedirector.InvalidVault.selector);
        redirector.deposit(address(0x999), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
    }
    
    function test_MultiplePositionsPerDepositor() public {
        address charity2 = address(0x5);
        
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT * 3);
        
        // Create first position for charity
        (, bytes32 position1) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        
        // Create second position for charity2 
        (, bytes32 position2) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity2);
        
        // Create third position for charity again
        (, bytes32 position3) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        
        vm.stopPrank();
        
        // Verify all positions are different
        assertTrue(position1 != position2, "Position 1 and 2 should be different");
        assertTrue(position1 != position3, "Position 1 and 3 should be different");
        assertTrue(position2 != position3, "Position 2 and 3 should be different");
        
        // Verify position details
        (,, address ben1,,,,) = redirector.getPosition(position1);
        (,, address ben2,,,,) = redirector.getPosition(position2);
        (,, address ben3,,,,) = redirector.getPosition(position3);
        
        assertEq(ben1, charity, "Position 1 beneficiary mismatch");
        assertEq(ben2, charity2, "Position 2 beneficiary mismatch");
        assertEq(ben3, charity, "Position 3 beneficiary mismatch");
        
        // Test getting depositor positions
        bytes32[] memory positions = redirector.getDepositorPositions(alice, address(vault));
        assertEq(positions.length, 3, "Should have 3 positions");
        assertEq(positions[0], position1, "Position index 0 mismatch");
        assertEq(positions[1], position2, "Position index 1 mismatch");
        assertEq(positions[2], position3, "Position index 2 mismatch");
    }

    function test_RevertInvalidBeneficiary() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        
        vm.expectRevert(YieldRedirector.InvalidBeneficiary.selector);
        redirector.deposit(address(vault), DEPOSIT_AMOUNT, address(0));
        vm.stopPrank();
    }
    
    function test_AddVaultValidation() public {
        // Create a new redirector to test adding vaults
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Should succeed with valid vault
        newRedirector.addVault(address(vault));
        
        // Verify vault was added by checking vaultInfo
        (address vaultAddr, address assetAddr) = newRedirector.vaultInfo(address(vault));
        assertEq(vaultAddr, address(vault), "Vault address should match");
        assertEq(assetAddr, address(asset), "Asset address should match");
    }
    
    function test_RevertInvalidVaultAddress() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Test zero address
        vm.expectRevert(YieldRedirector.InvalidVault.selector);
        newRedirector.addVault(address(0));
        
        // Test EOA (not a contract)
        vm.expectRevert(YieldRedirector.InvalidVault.selector);
        newRedirector.addVault(alice);
    }
    
    function test_RevertDuplicateVault() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Add vault first time - should succeed
        newRedirector.addVault(address(vault));
        
        // Try to add same vault again - should fail
        vm.expectRevert(YieldRedirector.VaultAlreadyAdded.selector);
        newRedirector.addVault(address(vault));
    }
    
    function test_RevertInvalidERC4626() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Try to add a regular ERC20 as a vault (not ERC4626)
        vm.expectRevert(YieldRedirector.NotERC4626Compliant.selector);
        newRedirector.addVault(address(asset));
    }
    
    function test_RevertMaliciousVault() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Create a malicious vault that returns 0 shares
        MaliciousVault maliciousVault = new MaliciousVault(asset);
        
        // Should fail due to vault math inconsistency (returns 0 shares)
        vm.expectRevert(YieldRedirector.VaultMathInconsistent.selector);
        newRedirector.addVault(address(maliciousVault));
    }
    
    function test_RevertInconsistentVaultMath() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Create a vault with inconsistent share/asset conversion
        InconsistentVault inconsistentVault = new InconsistentVault(asset);
        
        // Should fail due to inconsistent math (1:1 vs 1:10 conversion)
        vm.expectRevert(YieldRedirector.VaultMathInconsistent.selector);
        newRedirector.addVault(address(inconsistentVault));
    }
    
    function test_AutoAddVaultOnDeposit() public {
        // Create a new redirector without pre-adding vault
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Create a new vault that hasn't been added yet
        MockVault newVault = new MockVault(asset, "New Vault", "vNEW");
        
        // Verify vault is not added initially
        (address vaultAddr,) = newRedirector.vaultInfo(address(newVault));
        assertEq(vaultAddr, address(0), "Vault should not exist initially");
        
        vm.startPrank(alice);
        asset.approve(address(newRedirector), DEPOSIT_AMOUNT);
        
        // Deposit should auto-add the vault and succeed
        (uint256 shares, bytes32 positionId) = newRedirector.deposit(
            address(newVault),
            DEPOSIT_AMOUNT,
            charity
        );
        
        vm.stopPrank();
        
        // Verify deposit succeeded
        assertGt(shares, 0, "Should receive shares");
        
        // Verify vault was automatically added
        (address autoAddedVault, address autoAddedAsset) = newRedirector.vaultInfo(address(newVault));
        assertEq(autoAddedVault, address(newVault), "Vault should be added");
        assertEq(autoAddedAsset, address(asset), "Asset should match");
        
        // Verify position was created correctly
        (
            uint256 posShares,
            uint256 deposited,
            address beneficiary,
            address depositor,
            address positionVault,
            ,
        ) = newRedirector.getPosition(positionId);
        
        assertEq(posShares, shares, "Position shares mismatch");
        assertEq(deposited, DEPOSIT_AMOUNT, "Deposited amount mismatch");
        assertEq(beneficiary, charity, "Beneficiary mismatch");
        assertEq(depositor, alice, "Depositor mismatch");
        assertEq(positionVault, address(newVault), "Vault mismatch");
    }
    
    function test_AutoAddVaultRejectsMalicious() public {
        YieldRedirector newRedirector = new YieldRedirector();
        
        // Create a malicious vault
        MaliciousVault maliciousVault = new MaliciousVault(asset);
        
        vm.startPrank(alice);
        asset.approve(address(newRedirector), DEPOSIT_AMOUNT);
        
        // Deposit should fail due to malicious vault validation
        vm.expectRevert(YieldRedirector.VaultMathInconsistent.selector);
        newRedirector.deposit(
            address(maliciousVault),
            DEPOSIT_AMOUNT,
            charity
        );
        
        vm.stopPrank();
        
        // Verify no vault was added
        (address vaultAddr,) = newRedirector.vaultInfo(address(maliciousVault));
        assertEq(vaultAddr, address(0), "Malicious vault should not be added");
    }
    
    function test_AutoAddVaultSkipsDuplicates() public {
        YieldRedirector newRedirector = new YieldRedirector();
        MockVault newVault = new MockVault(asset, "Test Vault", "vTEST");
        
        vm.startPrank(alice);
        asset.approve(address(newRedirector), DEPOSIT_AMOUNT * 2);
        
        // First deposit should add vault
        newRedirector.deposit(address(newVault), DEPOSIT_AMOUNT, charity);
        
        // Verify vault was added
        (address firstVault,) = newRedirector.vaultInfo(address(newVault));
        assertEq(firstVault, address(newVault), "Vault should be added after first deposit");
        
        // Second deposit should NOT add duplicate vault (no way to verify count, but should not revert)
        newRedirector.deposit(address(newVault), DEPOSIT_AMOUNT, charity);
        
        // Vault should still exist (same check as before)
        (address secondVault,) = newRedirector.vaultInfo(address(newVault));
        assertEq(secondVault, address(newVault), "Vault should still exist after second deposit");
        
        vm.stopPrank();
    }
    
    function test_GetClaimableYield() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        // Initially no yield
        uint256 initialYield = redirector.getClaimableYield(positionId);
        assertEq(initialYield, 0, "Initial yield should be 0");
        
        // Generate some yield
        vault.generateYield(100e18);
        
        // Should now have claimable yield
        uint256 claimableYield = redirector.getClaimableYield(positionId);
        assertGt(claimableYield, 0, "Should have claimable yield after vault generates yield");
        
        // Verify getPosition returns same yield
        (,,,,, uint256 currentValue, uint256 accruedYield) = redirector.getPosition(positionId);
        assertEq(accruedYield, claimableYield, "getPosition should match getClaimableYield");
        assertGt(currentValue, DEPOSIT_AMOUNT, "Current value should exceed deposited amount");
    }
    
    function test_ModifierAccessControl() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        // Bob should not be able to update Alice's beneficiary
        vm.prank(bob);
        vm.expectRevert("Not position owner");
        redirector.updateBeneficiary(positionId, bob);
        
        // Bob should not be able to withdraw from Alice's position
        vm.prank(bob);
        vm.expectRevert("Not position owner");
        redirector.withdraw(positionId, DEPOSIT_AMOUNT / 2);
        
        // Bob should not be able to withdrawAll from Alice's position
        vm.prank(bob);
        vm.expectRevert("Not position owner");
        redirector.withdrawAll(positionId);
        
        // Alice should not be able to claim yield (charity is beneficiary)
        vm.prank(alice);
        vm.expectRevert("Not beneficiary");
        redirector.claimYield(positionId);
        
        // Only charity should be able to claim yield
        vault.generateYield(100e18);
        vm.prank(charity);
        // This should succeed (no revert expected)
        redirector.claimYield(positionId);
    }
    
    function test_ModifierNonexistentPosition() public {
        bytes32 fakePositionId = keccak256("fake");
        
        // All functions should revert with PositionNotFound for nonexistent position
        vm.expectRevert(YieldRedirector.PositionNotFound.selector);
        redirector.updateBeneficiary(fakePositionId, charity);
        
        vm.expectRevert(YieldRedirector.PositionNotFound.selector);
        redirector.withdraw(fakePositionId, 100);
        
        vm.expectRevert(YieldRedirector.PositionNotFound.selector);
        redirector.withdrawAll(fakePositionId);
        
        vm.expectRevert(YieldRedirector.PositionNotFound.selector);
        redirector.claimYield(fakePositionId);
    }
    
    function test_YieldClaimingScenarios() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        console.log("=== Scenario 1: Normal yield claim ===");
        // Generate yield
        vault.generateYield(500e18);
        
        uint256 yieldBefore = redirector.getClaimableYield(positionId);
        console.log("Claimable yield:", yieldBefore);
        
        uint256 charityBalanceBefore = asset.balanceOf(charity);
        
        // Claim yield
        vm.prank(charity);
        redirector.claimYield(positionId);
        
        uint256 charityBalanceAfter = asset.balanceOf(charity);
        uint256 yieldAfter = redirector.getClaimableYield(positionId);
        
        console.log("Charity received:", charityBalanceAfter - charityBalanceBefore);
        console.log("Remaining yield:", yieldAfter);
        
        console.log("=== Scenario 2: Owner withdraws, then check yield ===");
        // Generate more yield
        vault.generateYield(200e18);
        
        uint256 yieldBeforeWithdraw = redirector.getClaimableYield(positionId);
        console.log("Yield before owner withdrawal:", yieldBeforeWithdraw);
        
        // Owner withdraws some principal
        vm.prank(alice);
        redirector.withdraw(positionId, DEPOSIT_AMOUNT / 2);
        
        uint256 yieldAfterWithdraw = redirector.getClaimableYield(positionId);
        console.log("Yield after owner withdrawal:", yieldAfterWithdraw);
        
        // This might show incorrect yield calculation
        console.log("Yield difference:", int256(yieldAfterWithdraw) - int256(yieldBeforeWithdraw));
    }
    
    function test_YieldCalculationAfterPartialWithdraw() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        // Generate yield: 1000 assets → 1500 assets (500 yield)
        vault.generateYield(500e18);
        
        uint256 initialYield = redirector.getClaimableYield(positionId);
        console.log("Initial yield:", initialYield);
        
        // Owner withdraws half of original deposit (500 assets)
        vm.prank(alice);
        redirector.withdraw(positionId, DEPOSIT_AMOUNT / 2);
        
        // Check remaining position
        (uint256 shares, uint256 depositedAssets,,,,uint256 currentValue,) = redirector.getPosition(positionId);
        console.log("After withdrawal - shares:", shares);
        console.log("After withdrawal - depositedAssets:", depositedAssets);
        console.log("After withdrawal - currentValue:", currentValue);
        
        uint256 yieldAfterWithdraw = redirector.getClaimableYield(positionId);
        console.log("Yield after withdrawal:", yieldAfterWithdraw);
        
        // The issue: yield calculation might be wrong
        // Should track what portion of shares represents original principal vs yield
    }
    
    function test_YieldCalculationComplexScenario() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        // Step 1: Generate yield and claim it
        vault.generateYield(500e18);
        uint256 yieldStep1 = redirector.getClaimableYield(positionId);
        console.log("Yield after generating 500:", yieldStep1);
        
        vm.prank(charity);
        redirector.claimYield(positionId);
        
        // Step 2: Generate more yield
        vault.generateYield(300e18);
        uint256 yieldStep2 = redirector.getClaimableYield(positionId);
        console.log("Yield after generating 300 more:", yieldStep2);
        
        // Step 3: Owner withdraws some - this is where issues might appear
        vm.prank(alice);
        redirector.withdraw(positionId, 200e18);
        
        uint256 yieldStep3 = redirector.getClaimableYield(positionId);
        console.log("Yield after owner withdraws 200:", yieldStep3);
        
        // Check position state
        (,uint256 deposited,,,,uint256 currentValue,) = redirector.getPosition(positionId);
        console.log("Deposited assets after withdrawal:", deposited);
        console.log("Current value after withdrawal:", currentValue);
        
        // The critical test: yield should be currentValue - deposited
        // But is deposited correctly updated?
        uint256 expectedYield = currentValue > deposited ? currentValue - deposited : 0;
        console.log("Expected yield:", expectedYield);
        
        // Generate more yield to see if calculation is still correct
        vault.generateYield(100e18);
        uint256 finalYield = redirector.getClaimableYield(positionId);
        console.log("Final yield after generating 100 more:", finalYield);
    }
    
    function test_EdgeCase_WithdrawMoreThanPrincipal() public {
        vm.startPrank(alice);
        asset.approve(address(redirector), DEPOSIT_AMOUNT);
        (, bytes32 positionId) = redirector.deposit(address(vault), DEPOSIT_AMOUNT, charity);
        vm.stopPrank();
        
        // Generate significant yield
        vault.generateYield(2000e18); // 1000 → 3000 (2000 yield)
        
        uint256 initialYield = redirector.getClaimableYield(positionId);
        console.log("Initial yield:", initialYield);
        
        // Owner tries to withdraw more than original principal
        // This should withdraw principal + some yield
        vm.prank(alice);
        redirector.withdraw(positionId, 1500e18); // Withdraw 1500 from original 1000
        
        // Check what happened
        (,uint256 deposited,,,,uint256 currentValue, uint256 remainingYield) = redirector.getPosition(positionId);
        console.log("Deposited after withdrawal:", deposited);
        console.log("Current value after withdrawal:", currentValue);
        console.log("Remaining yield:", remainingYield);
        
        // The deposited should go to 0 if we withdrew more than principal
        // And remaining yield should be reduced
        
        // Can beneficiary still claim remaining yield?
        if (remainingYield > 0) {
            uint256 charityBefore = asset.balanceOf(charity);
            vm.prank(charity);
            redirector.claimYield(positionId);
            uint256 charityAfter = asset.balanceOf(charity);
            console.log("Charity claimed:", charityAfter - charityBefore);
        }
    }
}