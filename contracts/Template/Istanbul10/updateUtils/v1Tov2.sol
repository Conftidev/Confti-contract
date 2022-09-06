 
//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol";

 
contract v1Tov2{
    address immutable newVoteTemplate;
    address immutable newRouterTemplate;
    address immutable newVeTokenTemplate;
    address immutable newAuctionTemplate;
    address immutable newVaultTemplate;
    bytes32 constant _IMPLEMENTATION_SLOT = 0x5f62ce3c9aebd463c7a36ab1b244d2bb94f07a2c13889b3b687940ebc467b9b3;
 

    constructor (address newVoteTemplate_,address newRouterTemplate_,address newVeTokenTemplate_,address newAuctionTemplate_,address newVaultTemplate_) {
        require(newVoteTemplate_ != address(0) && newRouterTemplate_!= address(0) && newVeTokenTemplate_!= address(0) && newAuctionTemplate_!= address(0) && newVaultTemplate_!= address(0),"Router::constructor Parameters newVoteTemplate_, newRouterTemplate_, newVeTokenTemplate_, newAuctionTemplate_, newVaultTemplate_ cannot be a 0 address");
        newVoteTemplate = newVoteTemplate_;
        newRouterTemplate = newRouterTemplate_;
        newVeTokenTemplate = newVeTokenTemplate_;
        newAuctionTemplate = newAuctionTemplate_;
        newVaultTemplate = newVaultTemplate_;
    }

    function updateRouterUtils() external{ 
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = newRouterTemplate;
    }

    function updateAuctionUtils() external{ 
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = newAuctionTemplate;
    }
 
    
    function updateVaultUtils() external{ 
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = newVaultTemplate;
    }
 
    function updateVoteUtils() external {
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = newVoteTemplate;
    }


    function updateVeTokenUtils() external{
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = newVeTokenTemplate;
    }
 
  }
 
