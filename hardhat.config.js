require("@nomiclabs/hardhat-waffle");
require('hardhat-abi-exporter');
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
  networks: { 
    local:{
    url: 'http://127.0.0.1:8545', //本地RPC地址
    accounts:[
      // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      
      // Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      
      // Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
      
      // Account #3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (10000 ETH)
      '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
      
      // Account #4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (10000 ETH)
      '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
      
      // Account #5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (10000 ETH)
      '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
      
      // Account #6: 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (10000 ETH)
      '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e'
    ]
  },
    //  kovan: {
    //   url: "https://kovan.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
    //   accounts: [private_Key]
    // },
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
      accounts: [private_Key]
    },
  //   ropsten: {
  //     url : "https://ropsten.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
  //     accounts: [private_Key]
  //   },
  //   mainNet:{
  //     url : "https://mainnet.infura.io/v3/5edf63dd8807423f9e95cacfc0560360",
  //     accounts: [private_Key]
  //   },
    mainNet: {
      url: "https://mainnet.infura.io/v3/63b48421bb4e468b935489be18d9dbfc",
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
  abiExporter: {
    path: './abi-address/rinkeby/abi',
    clear: true,
    flat: true,
    only: ["Factory","Auction","Router","Vault","VeToken","Vote"],
    spacing: 2,
    format:"json", 
  }
};
