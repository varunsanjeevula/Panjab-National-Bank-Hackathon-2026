// Quick test of the FIXED TLS probe module directly
const { probeTLS, parseLeafCertificate } = require('../scanner/tlsProbe');

async function test() {
  try {
    console.log('Testing TLS probe against github.com...');
    const result = await probeTLS('github.com', 443);
    console.log('\n=== SUCCESS ===');
    console.log('TLS Version:', result.tlsVersion);
    console.log('Cipher:', result.negotiatedCipher.standardName);
    console.log('Key Algorithm:', result.certificate.keyAlgorithm);
    console.log('Key Size:', result.certificate.keySize);
    console.log('Sig Algorithm:', result.certificate.signatureAlgorithm);
    console.log('Common Name:', result.certificate.commonName);
    console.log('Issuer:', result.certificate.issuerOrg);
    console.log('Expired:', result.certificate.isExpired);
    console.log('Days Until Expiry:', result.certificate.daysUntilExpiry);
    console.log('SANs:', result.certificate.sans?.slice(0, 5).join(', '));
    console.log('Ephemeral Key:', JSON.stringify(result.ephemeralKeyInfo));
  } catch (err) {
    console.error('FAILED:', err.message);
  }
  process.exit(0);
}

test();
