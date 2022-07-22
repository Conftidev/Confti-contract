//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVaultData {

    function router() external returns(address);

    function nftIndex(address,uint256) external returns(uint256); 

    function redeemable() external returns(bool);  

    function initializer() external returns(bool); 
}
