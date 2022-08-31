//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../../../utils/State.sol";
interface IVault {
    function getFreedomNFT() external view returns(uint256[] memory);  
 
    function getNftState(address,uint256) external view returns(State.NftState);

    function getEntireVaultState() external view returns(State.NftState);

    function getNftActivity(address,uint256) external view returns(string memory);

    function getEntireVaultActivity() external view returns(string memory);


    // ------------------------------      NFT       --------------------------------------------
    function depositNFTAsset(address[] memory,uint256[] memory,uint256[] memory,address,uint256) external;
    
    function sendNFTAsset(address[] memory,uint256[] memory, address) external;

    function sendNFTAssetIndex(uint256[] memory, address) external;
    
    function safeSetState(address,uint256,State.NftState,string memory) external;

    function noncallable() external;

    function redeem() external;
    
    // --------------------------------      Asset      -----------------------------------------

    function sendETH(address payable,uint256) external;

    function sendERC20(address,address,uint256) external;
    
    // function sendWETH(address, uint256) external;

    function updateVault(address) external;

    
    event Redeem(address redeemer);
}
