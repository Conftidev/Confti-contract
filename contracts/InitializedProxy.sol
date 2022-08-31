// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/StorageSlotUpgradeable.sol";
/**
 * @title InitializedProxy
 * @author Anna Carroll
 */
contract InitializedProxy {
    // address of logic contract
    // slot bytes32(uint256(keccak256('EIP1967.PROXY.CONFTI.IMPLEMENTATION')) - 1)
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x5f62ce3c9aebd463c7a36ab1b244d2bb94f07a2c13889b3b687940ebc467b9b3;

    // ======== Constructor =========
    constructor(
        address logic,
        bytes memory initializationCalldata
    ) { 
        require(logic != address(0),"Proxy :: Wrong proxy contract address");
        StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value = logic;
        // Delegatecall into the logic contract, supplying initialization calldata
        (bool _ok, bytes memory returnData) =
            logic.delegatecall(initializationCalldata);
        // Revert if delegatecall to implementation reverts
        require(_ok, string(returnData));
    }
     

    // ======== Fallback =========

    fallback() external payable {
        address _impl = StorageSlotUpgradeable.getAddressSlot(_IMPLEMENTATION_SLOT).value;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), _impl, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
                case 0 {
                    revert(ptr, size)
                }
                default {
                    return(ptr, size)
                }
        }
    }

    // ======== Receive =========

    receive() external payable {} // solhint-disable-line no-empty-blocks
}
