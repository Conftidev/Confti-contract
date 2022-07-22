//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../../../utils/State.sol";
import "../Interface/IVaultData.sol";

contract VaultData is IVaultData {
    address public override router;

    struct NFT {
        address nft;
        uint256 nftId;
        uint256 amount;
        State.NftType mold;
        State.NftState state;
        string activity;
        uint256 weight;
    }

    NFT[] public nfts; 

    uint256[] internal freedomNFTInNFTSIndex; 

    mapping (address => mapping (uint256 => uint256)) public override nftIndex;

    bool public override redeemable; 

    bool public override initializer; 

    bool internal reentry;
}
