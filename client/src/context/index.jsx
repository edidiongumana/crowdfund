import React, { useContext, createContext } from 'react';

import {
  useAddress,
  useContract,
  useConnect,
  useContractWrite,
  metamaskWallet,
} from '@thirdweb-dev/react';
import { BinanceTestnet } from '@thirdweb-dev/chains';
import { ethers } from 'ethers';
import { TEST_CONTRACT, TEST_CONTRACT_ABI } from '../utils';

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract } = useContract(TEST_CONTRACT, TEST_CONTRACT_ABI);

  const { mutateAsync } = useContractWrite(contract, 'createCampaign');

  const address = useAddress();

  const connect = useConnect();

  const handleConnect = async () => {
    await connect(metamaskWallet(), { chainId: BinanceTestnet.chainId });
  };

  const publishCampaign = async (form) => {
    let owner = address;
    let title = form.title;
    let description = form.description;
    let target = ethers.utils.parseUnits(form.target, 18);
    let deadline = new Date(form.deadline).getTime();
    let image = form.image;

    try {
      const data = await mutateAsync({
        args: [owner, title, description, target, deadline, image],
      });

      console.log('contract call success', data);
    } catch (error) {
      console.log('contract call failure', error);
    }
  };

  const getCampaigns = async () => {
    const campaigns = await contract.call('getCampaigns');

    const parsedCampaings = campaigns.map((campaign, i) => ({
      owner: campaign.owner,
      title: campaign.title,
      description: campaign.description,
      target: ethers.utils.formatEther(campaign.target.toString()),
      deadline: campaign.deadline.toNumber(),
      amountCollected: ethers.utils.formatEther(
        campaign.amountCollected.toString()
      ),
      image: campaign.image,
      pId: i,
    }));

    return parsedCampaings;
  };

  const getUserCampaigns = async () => {
    const allCampaigns = await getCampaigns();

    const filteredCampaigns = allCampaigns.filter(
      (campaign) => campaign.owner === address
    );

    return filteredCampaigns;
  };

  const donate = async (pId, amount) => {
    const data = await contract.call('donateToCampaign', pId, {
      value: ethers.utils.parseEther(amount),
    });

    return data;
  };

  const getDonations = async (pId) => {
    const donations = await contract.call('getDonators', pId);
    const numberOfDonations = donations[0].length;

    const parsedDonations = [];

    for (let i = 0; i < numberOfDonations; i++) {
      parsedDonations.push({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString()),
      });
    }

    return parsedDonations;
  };

  return (
    <StateContext.Provider
      value={{
        address,
        contract,
        connect: handleConnect,
        publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const useStateContext = () => useContext(StateContext);
