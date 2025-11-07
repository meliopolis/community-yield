import axios from 'axios';

export type TxnObject = {
  from?: string;
  to: string;
  data?: string;
  value?: bigint;
  gas?: bigint;
  nonce?: number;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  overrides?: object;
  state_objects?: object;
  simulationId?: string | null;
  status?: boolean | null;
  error?: string | null;
};

const tenderlyDefaults = {
  gas: 8000000,
  gas_price: '0',
  value: 0,
  save_if_fails: true,
  save: true,
  estimate_gas: true,
  simulation_type: 'full',
};

// const tenderlyInstance = new Tenderly({
//   accessKey: import.meta.env.VITE_TENDERLY_KEY as string,
//   accountName: 'aseem',
//   projectName: 'messenger',
//   network: Network.MAINNET,
// });



export async function simulate(chainId: number, { from, to, data, state_objects }: TxnObject) {
  // TODO: add a state override to give sender weth and approve spokepool
  // const chainConfig = chainConfigList[chainId];
  // const state_objects = {
  //   [chainConfig.wethAddress]: {

  //   }
  // }
  const body = {
    network_id: chainId.toString(),
    from: from,
    to: to,
    input: data,
    state_objects: state_objects,
    ...tenderlyDefaults,
  };

  const headers = {
    headers: {
      'content-type': 'application/JSON',
      'X-Access-Key': import.meta.env.VITE_TENDERLY_KEY as string,
    },
  };
  const apiURL = `https://api.tenderly.co/api/v1/account/${import.meta.env.VITE_TENDERLY_USER}/project/${import.meta.env.VITE_TENDERLY_PROJECT}/simulate`;
  try {
    const resp = await axios.post(apiURL, body, headers);
    console.log('tenderly sim response', resp.data);
    return {
      data: resp.data,
      error: resp.data.error,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error simulating txn:', error.response?.data);
    }
    return {
      data: null,
      error: error,
    };
  }
}

export async function simulateBundle(chainId: number, txns: TxnObject[]) {
  console.log('Simulating bundle: ', txns);
  if (txns.length === 0) {
    return {
      data: null,
      error: 'No transactions to simulate',
    };
  }
  const body = {
    simulations: txns.map((txn) => ({
      network_id: chainId.toString(),
      from: txn.from,
      to: txn.to,
      input: txn.data,
      ...tenderlyDefaults,
    })),
  };
  const headers = {
    headers: {
      'content-type': 'application/JSON',
      'X-Access-Key': import.meta.env.VITE_TENDERLY_KEY as string,
    },
  };
  const apiURL = `https://api.tenderly.co/api/v1/account/${import.meta.env.VITE_TENDERLY_USER}/project/${import.meta.env.VITE_TENDERLY_PROJECT}/simulate-bundle`;
  try {
    const resp = await axios.post(apiURL, body, headers);
    console.log('resp', resp.data);
    return {
      data: resp.data.simulation_results,
      error: resp.data.error,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error simulating txn:', error.response?.data);
    }
    return {
      data: null,
      error: error,
    };
  }
}

export const getSimulationURL = (simulationId: string) =>
  `https://dashboard.tenderly.co/${import.meta.env.VITE_TENDERLY_USER}/${import.meta.env.VITE_TENDERLY_PROJECT}/simulator/${simulationId}`;

export const shareSimulation = async (simulationId: string) => {
  const url = `https://api.tenderly.co/api/v1/account/${import.meta.env.VITE_TENDERLY_USER}/project/${import.meta.env.VITE_TENDERLY_PROJECT}/simulations/${simulationId}/share`;
  try {
    const headers = {
      headers: {
        'content-type': 'application/JSON',
        'X-Access-Key': process.env.TENDERLY_KEY as string,
      },
    };
    const resp = await axios.post(url, {}, headers);
    return resp.data.share_url;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error simulating txn:', error.response?.data);
    }
    throw error;
  }
};
