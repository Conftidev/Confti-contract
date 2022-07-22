//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
interface IFactory {
    function vaultRouterCount() view external returns(uint256);

    function routers(uint256) view external returns(address);

    function calibrationTemplate(address) view external returns(address);

    function settings() external view returns(address);

    function routerTemplateMap(address) external returns(bool);

    function mint(address) external returns(uint256);

    function setLogic(address,bool) external;

    function updateUtilsAddres(string memory,uint16) external returns(address);

    function setUpdateUtilsAddres(string memory,uint16, address ) external;
}
