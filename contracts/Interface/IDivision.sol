//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDivision {
    function mintDivision(address,uint256) external;
    function burnDivision(address,uint256) external;
}
