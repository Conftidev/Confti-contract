//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRouterData {
    // ---------------    address  ------------------------
    function factory() view external returns(address);

    function vault() view external returns(address); 
    
    function veToken() view external returns(address); 
    
    function auction() view external returns(address); 
    
    function vote() view external returns(address); 

    function division() view external returns(address); 
    
    function curator() view external returns(address); 
     
    // ---------------    manage    ----------------------
    function whiteList(address) view external returns(bool);

    function initializer() view external returns(bool);

    function open() view external returns(bool);

    // ---------------    router     ---------------------
    function daoName() view external returns(string memory);
    
    function lastClaimed() view external returns(uint256);

    function reserveRatio() view external returns(uint256);

    function reserveAmount() view external returns(uint256);

    function supply() view external returns(uint256);

    function fee() view external returns(uint256);
}
