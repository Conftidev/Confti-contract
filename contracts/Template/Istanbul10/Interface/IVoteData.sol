//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVoteData { 
    function templateState(uint) view external returns(bool);
}
