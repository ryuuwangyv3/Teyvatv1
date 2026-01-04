
/**
 * 🔐 SECURITY MODULE: ENCRYPTED CREDENTIAL STORAGE
 */
import { obf } from './securityService';

// Obfuscated keys (XOR 42) - Use Admin Console to override with real values
const _S_U = obf("BZZJY\x10\x05\x05lvls  dlvckzzkqitsh\x0eie\x0eie"); // Decodes to: https://your-project.supabase.co
const _S_K = obf("o FlSGiOiVIdXjMZNkVJT1pXVUpXVEpYTkpYVUxZTkpkRkV3T01VTkV4UTFORllUaVpXelV6TmtWSlpVMkpRVnRNWWtuMUhLWGREaG00");
const _O_K = obf("ai-fxe`-\x00J@\x12|G Z \x18\x00\x1c\x0b\x0eia_q\x00F\x0bHGG_m\x08IB\x11\x14\x0b\x02XHoBfMv`_f`kbBCZ\x07@\x0b@mI\x01M_QS\x15W\x0bciQX\x10\x10T\x11BlkB@\x00\x02\x0b_^\x18\\xkOxxG\x06zb\x14eG\\rEP\x11\x15\x1f\x13\x00\x19\x04Xhy\x00\x1d\x12X`_oMf`v\x1d\x13wYrr\x12\x12 \x1cl  ia\x1b_X\x06X\x04I");
const _H_T = obf("nf_GzTKvSprwrkaptUTlSgUigAtuPGnnRfZbQ");
const _OR_K = obf("ai-er-v\x03-@ifiiiX@le\x13iXacb\x13\x11iXiib@ifiafecd\x13\x12iXab\x13fcb@\x1c@fdf");
const _P_K = obf("YQ}\x13xx\x0f@ KS-P@xC~#PPE\x1b\x19|xKihHe\x13EY\""); // sk_9RR5jJqiyGzjRmTIzzo13VRaCbrO9gsH

const S3_E = obf("zvvru@))lvls  dlvckzzkqitsh\x0elvlsbh\x0elvkclvckzzkqitsh\x0elv@lvlsbh@f\x0ez\x11");
const S3_R = obf("cr-iy vn- ");
const S3_A = obf("\x02i\x03\x14\x00\x13\x10\x0b\x00\x13\x10te\x0b\x15e\x02\x17\x01\x14\x0b\x10\x12db\x0b\x00\x10");
const S3_S = obf("\x00\x16\x11ie\x11\x10\x03\x00\x17\x10\x12\x03\x01\x13\x00\x11\x13\x10\x10\x01\x15\x14\x0b\x00\x15\x15ff\x11\x10\x10\x13\x15\x17\x10db\x11\x15f`");
const S3_B = obf("voma v-itinf|o");

/**
 * Returns the credentials safely at runtime after de-obfuscation.
 */
export const getSystemCredentials = () => {
    const url = obf(_S_U);
    return { 
        url: url.startsWith('http') ? url : '', 
        key: obf(_S_K), 
        openai: obf(_O_K), 
        huggingface: obf(_H_T),
        openrouter: obf(_OR_K),
        pollinations: obf(_P_K),
        s3: {
            endpoint: obf(S3_E),
            region: obf(S3_R),
            accessKey: obf(S3_A),
            secretKey: obf(S3_S),
            bucket: obf(S3_B)
        }
    };
};
