import CryptoJS from 'crypto-js';

const { ENCRYPTION_KEY } = process.env;

const encrypt = obj =>
    CryptoJS.AES.encrypt(JSON.stringify(obj), ENCRYPTION_KEY).toString();

const decrypt = obj => {
    try {
        return JSON.parse(
            CryptoJS.AES.decrypt(obj, ENCRYPTION_KEY).toString(
                CryptoJS.enc.Utf8,
            ),
        );
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
