require("@nomiclabs/hardhat-waffle");
require('dotenv').config()
const {private_Key} = process.env

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      mining: {
        auto: false,
        interval: 1
      }
    },
    localNode: {
      url: "http://192.168.67.46:7545",
      accounts: [private_Key]
    },
    kovan: {
      url: "https://kovan.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
      accounts: [private_Key]
    },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
      accounts: [private_Key]
    },
    ropsten: {
      url : "https://ropsten.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
      accounts: [private_Key]
    },
    mainNet:{
      url : "https://mainnet.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
      accounts: [private_Key]
    }
  },
  solidity: {
    compilers: [
    {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
    },
    {
    version: "0.4.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
    },
    {
    version: "0.8.5",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
    },
    ],
    },
};
