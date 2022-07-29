//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRouter {
    function initialize(address,string memory) external;

    function curatorDeposit(address[] memory,uint256[] memory,uint256[] memory) external;

    function issue(uint256,string memory,uint256,uint256,uint256,uint256) external;

    function claimFees() external;

    function cash() external;

    // whiteList
    function mintToScale(uint256,address) external returns(uint256);

    function updateRouter(address) external;

    // get
    function versionInfo() pure external returns(string memory,uint16);

    function veTokenTemplate() view external returns(address); 

    function vaultTemplate() view external returns(address); 

    function auctionTemplate() view external returns(address); 

    function voteTemplate() view external returns(address); 

    function divisionTemplate() view external returns(address); 

    // event
    event Initialize(address curator, address vault); 

    event Cash(address indexed owner, uint256 shares); 

    event CuratorDeposit(address[] nft, uint256[] nftId,uint256[] amount); 

    event Issue(uint256 supply,string name, string symbol,uint256 reserveRatio, uint256 EntireVaultPrice,uint256 depositLength,uint256 rewardLength,address vetoken,address auction,address vote,address division); 
}
