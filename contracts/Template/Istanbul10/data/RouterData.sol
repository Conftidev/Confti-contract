//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../Interface/IRouterData.sol";

contract RouterData is IRouterData{
    // ---------------    Dao Address  ------------------------
    address override public factory; 

    address override public vault;

    address override public veToken;

    address override public auction;
    
    address override public vote;

    address override public division;

    address override public curator;

    // ---------------    manage    ----------------------
    mapping (address => bool) override public whiteList;
    
    bool override public initializer;

    bool override public open;
    
    bool internal reentry;

    // ---------------    router     ---------------------
    string override public daoName;

    uint256 override public lastClaimed;

    uint256 override public reserveRatio;

    uint256 override public reserveAmount;

    uint256 override public supply;
 
    uint256 override public fee;

    bool override public curatorChange;
}