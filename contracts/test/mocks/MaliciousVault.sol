// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MockERC20.sol";

// This contract pretends to be an ERC4626 but has broken math
contract MaliciousVault {
    MockERC20 public immutable asset;
    
    constructor(MockERC20 _asset) {
        asset = _asset;
    }
    
    function convertToShares(uint256 assets) external pure returns (uint256) {
        // Malicious: return 0 shares for any deposit
        return 0;
    }
    
    function convertToAssets(uint256 shares) external pure returns (uint256) {
        // Malicious: return massive amounts
        return shares * 1e18;
    }
    
    function totalAssets() external pure returns (uint256) {
        return 1e18;
    }
    
    // Missing other ERC4626 functions to trigger compliance check
}

// This contract has inconsistent math 
contract InconsistentVault {
    MockERC20 public immutable asset;
    
    constructor(MockERC20 _asset) {
        asset = _asset;
    }
    
    function convertToShares(uint256 assets) external pure returns (uint256) {
        return assets; // 1:1 ratio
    }
    
    function convertToAssets(uint256 shares) external pure returns (uint256) {
        return shares * 10; // 1:10 ratio - inconsistent!
    }
    
    function totalAssets() external pure returns (uint256) {
        return 1e18;
    }
}