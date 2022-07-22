//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library State {
    enum NftState {freedom, occupied, leave}
    enum NftType {NFT721, NFT1155,All}
}