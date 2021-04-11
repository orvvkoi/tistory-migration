import CryptoJS from 'crypto-js';
import config from '../config';

const encrypt = (obj: any) => CryptoJS.AES.encrypt(JSON.stringify(obj), config.cryptoEncryptKey).toString();

const decrypt = (obj: any) => {
  try {
    return JSON.parse(CryptoJS.AES.decrypt(obj, config.cryptoEncryptKey).toString(CryptoJS.enc.Utf8));
  } catch (err) {
    console.error(err);
    return '';
  }
};

const CryptoUtils = {
  encrypt,
  decrypt,
};

export default CryptoUtils;
