export const defaultSeedPassword = 'orvexa123';

export const getSeedPassword = () => process.env.DEMO_ACCOUNT_PASSWORD || defaultSeedPassword;

export const areDemoAccountsEnabled = () => {
  if (process.env.DEMO_ACCOUNTS_ENABLED === 'true') return true;
  if (process.env.DEMO_ACCOUNTS_ENABLED === 'false') return false;
  return ['development', 'test'].includes(process.env.NODE_ENV || 'development');
};
