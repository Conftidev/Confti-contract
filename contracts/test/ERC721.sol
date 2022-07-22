// SPDX-License-Identifier: MIT
pragma solidity 0.8.5;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract TestERC721 is ERC721Burnable {
    constructor() ERC721("TestNFT", "tNFT") {} // solhint-disable-line no-empty-blocks

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function batchMint(address _to,uint256[] memory tokenIds) external {
        uint256 length = tokenIds.length;
        for(uint256 i;length > i;i++){
            _mint(_to,tokenIds[i]);
        }
    }

    function destruct() public {
        selfdestruct(payable(address(0)));
    }
}
