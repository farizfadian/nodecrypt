#!/usr/bin/env node

/**
 * NodeCrypt CLI - Command line tool for encrypting and decrypting values.
 *
 * Usage:
 *   nodecrypt encrypt -p <password> -v <value>
 *   nodecrypt decrypt -p <password> -v <encrypted_value>
 *   nodecrypt encrypt-file -p <password> -i <input_file> -o <output_file>
 *
 * Environment variable NODECRYPT_PASSWORD can be used instead of -p flag.
 *
 * Made with ❤️ from Claude AI for Node.js developers who need Jasypt.
 */

import { Encryptor } from './encryptor';
import { JasyptEncryptor, JasyptStrongEncryptor } from './jasypt-compat';
import { isEncrypted } from './utils';
import * as fs from 'fs';

const VERSION = '1.0.0';

interface Args {
  command?: string;
  password?: string;
  value?: string;
  input?: string;
  output?: string;
  noPrefix?: boolean;
  jasypt?: boolean;
  jasyptStrong?: boolean;
}

function parseArgs(args: string[]): Args {
  const result: Args = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case 'encrypt':
      case 'decrypt':
      case 'encrypt-file':
      case 'decrypt-file':
      case 'version':
      case 'help':
        result.command = arg;
        break;
      case '-p':
      case '--password':
        result.password = args[++i];
        break;
      case '-v':
      case '--value':
        result.value = args[++i];
        break;
      case '-i':
      case '--input':
        result.input = args[++i];
        break;
      case '-o':
      case '--output':
        result.output = args[++i];
        break;
      case '--no-prefix':
        result.noPrefix = true;
        break;
      case '--jasypt':
        result.jasypt = true;
        break;
      case '--jasypt-strong':
        result.jasyptStrong = true;
        break;
      case '-V':
      case '--version':
        result.command = 'version';
        break;
      case '-h':
      case '--help':
        result.command = 'help';
        break;
    }
    i++;
  }

  return result;
}

function getPassword(argsPassword?: string): string {
  return argsPassword || process.env.NODECRYPT_PASSWORD || '';
}

function createEncryptor(
  password: string,
  jasypt?: boolean,
  jasyptStrong?: boolean
): Encryptor | JasyptEncryptor | JasyptStrongEncryptor {
  if (jasypt) {
    return new JasyptEncryptor(password);
  } else if (jasyptStrong) {
    return new JasyptStrongEncryptor(password);
  }
  return new Encryptor(password);
}

function printUsage(): void {
  console.log(`
nodecrypt - Jasypt-like encryption for Node.js configurations

Made with ❤️ from Claude AI for Node.js developers who need Jasypt

Usage:
  nodecrypt <command> [options]

Commands:
  encrypt       Encrypt a single value
  decrypt       Decrypt a single value
  encrypt-file  Encrypt all values in a file
  decrypt-file  Decrypt all ENC(...) values in a file
  version       Show version information
  help          Show this help message

Options:
  -p, --password    Encryption password (or set NODECRYPT_PASSWORD env var)
  -v, --value       Value to encrypt/decrypt
  -i, --input       Input file path
  -o, --output      Output file path
  --no-prefix       Don't wrap encrypted value with ENC(...)
  --jasypt          Use Jasypt-compatible algorithm (PBEWithMD5AndDES)
  --jasypt-strong   Use Jasypt strong algorithm (PBEWithHmacSHA256AndAES_256)

Examples:
  # Encrypt a database password
  nodecrypt encrypt -p mySecret -v "db_password123"
  
  # Decrypt a value
  nodecrypt decrypt -p mySecret -v "ENC(base64encodedvalue)"
  
  # Encrypt values in a .env file
  nodecrypt encrypt-file -p mySecret -i .env.plain -o .env.encrypted
  
  # Use Jasypt-compatible encryption
  nodecrypt encrypt -p mySecret -v "secret" --jasypt

Environment Variables:
  NODECRYPT_PASSWORD  Password for encryption/decryption
`);
}

function cmdEncrypt(args: Args): void {
  const password = getPassword(args.password);
  if (!password) {
    console.error('Error: password is required (-p or NODECRYPT_PASSWORD)');
    process.exit(1);
  }

  if (!args.value) {
    console.error('Error: value is required (-v)');
    process.exit(1);
  }

  try {
    const enc = createEncryptor(password, args.jasypt, args.jasyptStrong);

    let result: string;
    if (args.noPrefix) {
      result = enc.encrypt(args.value);
    } else {
      result = enc.encryptWithPrefix(args.value);
    }

    console.log(result);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

function cmdDecrypt(args: Args): void {
  const password = getPassword(args.password);
  if (!password) {
    console.error('Error: password is required (-p or NODECRYPT_PASSWORD)');
    process.exit(1);
  }

  if (!args.value) {
    console.error('Error: value is required (-v)');
    process.exit(1);
  }

  try {
    const enc = createEncryptor(password, args.jasypt, args.jasyptStrong);

    let result: string;
    if (isEncrypted(args.value)) {
      result = enc.decryptPrefixed(args.value);
    } else {
      result = enc.decrypt(args.value);
    }

    console.log(result);
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

function cmdEncryptFile(args: Args): void {
  const password = getPassword(args.password);
  if (!password) {
    console.error('Error: password is required (-p or NODECRYPT_PASSWORD)');
    process.exit(1);
  }

  if (!args.input) {
    console.error('Error: input file is required (-i)');
    process.exit(1);
  }

  try {
    const enc = createEncryptor(password, args.jasypt, args.jasyptStrong);
    const content = fs.readFileSync(args.input, 'utf-8');
    const lines = content.split('\n');

    const outputLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Process lines with KEY=VALUE format
      if (trimmed.includes('=') && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIndex);
        let value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');

        // Encrypt if not already encrypted and not empty
        if (!isEncrypted(value) && value) {
          const encrypted = enc.encryptWithPrefix(value);
          outputLines.push(`${key}=${encrypted}`);
          continue;
        }
      }

      outputLines.push(line);
    }

    const output = outputLines.join('\n');

    if (args.output) {
      fs.writeFileSync(args.output, output, 'utf-8');
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

function cmdDecryptFile(args: Args): void {
  const password = getPassword(args.password);
  if (!password) {
    console.error('Error: password is required (-p or NODECRYPT_PASSWORD)');
    process.exit(1);
  }

  if (!args.input) {
    console.error('Error: input file is required (-i)');
    process.exit(1);
  }

  try {
    const enc = createEncryptor(password, args.jasypt, args.jasyptStrong);
    const content = fs.readFileSync(args.input, 'utf-8');
    const decrypted = enc.decryptAllInString(content);

    if (args.output) {
      fs.writeFileSync(args.output, decrypted, 'utf-8');
    } else {
      console.log(decrypted);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  switch (args.command) {
    case 'encrypt':
      cmdEncrypt(args);
      break;
    case 'decrypt':
      cmdDecrypt(args);
      break;
    case 'encrypt-file':
      cmdEncryptFile(args);
      break;
    case 'decrypt-file':
      cmdDecryptFile(args);
      break;
    case 'version':
      console.log(`nodecrypt ${VERSION}`);
      break;
    case 'help':
    default:
      printUsage();
      break;
  }
}

main();
