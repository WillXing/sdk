import { RecordPlaintext } from ".";
import { AleoNetworkClient } from "./network-client";
import {Account} from "./account";

/**
 * Interface for record search parameters. This allows for arbitrary search parameters to be passed to record provider
 * implementations.
 */
interface RecordSearchParams {
    [key: string]: any; // This allows for arbitrary keys with any type values
}

/**
 * Interface for a record provider. A record provider is used to find records for use in deployment and execution
 * transactions on the Aleo Network. A default implementation is provided by the NetworkRecordProvider class. However,
 * a custom implementation can be provided (say if records are synced locally to a database from the network) by
 * implementing this interface.
 */
interface RecordProvider {
    account: Account

    /**
     * Find a credits record with a given number of microcredits from the chosen provider
     *
     * @param microcredits {number} The number of microcredits to search for
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // A class implementing record provider can be used to find a record with a given number of microcredits
     * const record = await recordProvider.findCreditsRecord(5000, true, []);
     *
     * // When a record is found but not yet used, its nonce should be added to the nonces array so that it is not
     * // found again if a subsequent search is performed
     * const record2 = await recordProvider.findCreditsRecord(5000, true, [record.nonce()]);
     *
     * // When the program manager is initialized with the record provider it will be used to find automatically find
     * // fee records and amount records for value transfers so that they do not need to be specified manually
     * const programManager = new ProgramManager(networkClient, keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     */
    findCreditsRecord(microcredits: number, unspent: boolean,  nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext | Error>;

    /**
     * Find a list of credit records with a given number of microcredits from the chosen provider
     *
     * @param microcredits {number} The number of microcredits to search for
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // A class implementing record provider can be used to find a record with a given number of microcredits
     * const records = await recordProvider.findCreditsRecords([5000, 5000], true, []);
     *
     * // When a record is found but not yet used, it's nonce should be added to the nonces array so that it is not
     * // found again if a subsequent search is performed
     * const nonces = [];
     * records.forEach(record => { nonces.push(record.nonce()) });
     * const records2 = await recordProvider.findCreditsRecord(5000, true, nonces);
     *
     * // When the program manager is initialized with the record provider it will be used to find automatically find
     * // fee records and amount records for value transfers so that they do not need to be specified manually
     * const programManager = new ProgramManager(networkClient, keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     */
    findCreditsRecords(microcreditAmounts: number[], unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext[] | Error>;

    /**
     * Find an arbitrary record
     * // A class implementing record provider can be used to find a record from arbitrary programs
     * const records = await recordProvider.findCreditsRecords([5000, 5000], true, []);
     *
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // The RecordSearchParams interface can be used to create parameters for custom record searches which can then
     * // be passed to the record provider. An example of how this would be done for the credits.aleo program is shown
     * // below.
     *
     * class CustomRecordSearch implements RecordSearchParams {
     *     startHeight: number;
     *     endHeight: number;
     *     amount: number;
     *     constructor(startHeight: number, endHeight: number, credits: number, maxRecords: number) {
     *         this.startHeight = startHeight;
     *         this.endHeight = endHeight;
     *         this.amount = amount;
     *     }
     * }
     *
     * const params = new CustomRecordSearch(0, 100, 5000);
     *
     * const record = await recordProvider.findRecord(true, [], params);
     */
    findRecord(unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext | Error>;

    /**
     * Find multiple records from arbitrary programs
     *
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * // The RecordSearchParams interface can be used to create parameters for custom record searches which can then
     * // be passed to the record provider. An example of how this would be done for the credits.aleo program is shown
     * // below.
     *
     * class CustomRecordSearch implements RecordSearchParams {
     *     startHeight: number;
     *     endHeight: number;
     *     amount: number;
     *     maxRecords: number;
     *     constructor(startHeight: number, endHeight: number, credits: number, maxRecords: number) {
     *         this.startHeight = startHeight;
     *         this.endHeight = endHeight;
     *         this.amount = amount;
     *         this.maxRecords = maxRecords;
     *     }
     * }
     *
     * const records = await recordProvider.findRecord(true, [], params);
     */
    findRecords(unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext[] | Error>;
}

class NetworkRecordProvider implements RecordProvider {
    account: Account;
    networkClient: AleoNetworkClient;
    constructor(account: Account, networkClient: AleoNetworkClient) {
        this.account = account;
        this.networkClient = networkClient;
    }

    /**
     * Set the account used to search for records
     *
     * @param account {Account} The account to use for searching for records
     */
    setAccount(account: Account) {
        this.account = account;
    }

    /**
     * Find a list of credit records with a given number of microcredits by via the official Aleo API
     *
     * @param microcredits {number} The number of microcredits to search for
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     *
     * @example
     * // Create a new NetworkRecordProvider
     * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
     * const keyProvider = new AleoKeyProvider();
     * const recordProvider = new NetworkRecordProvider(account, networkClient);
     *
     * // The record provider can be used to find records with a given number of microcredits
     * const record = await recordProvider.findCreditsRecord(5000, true, []);
     *
     * // When a record is found but not yet used, it's nonce should be added to the nonces array so that it is not
     * // found again if a subsequent search is performed
     * const records = await recordProvider.findCreditsRecord(5000, true, [record.nonce()]);
     *
     * // When the program manager is initialized with the record provider it will be used to find automatically find
     * // fee records and amount records for value transfers so they do not need to be specified manually
     * const programManager = new ProgramManager(networkClient, keyProvider, recordProvider);
     * programManager.transfer(1, "aleo166q6ww6688cug7qxwe7nhctjpymydwzy2h7rscfmatqmfwnjvggqcad0at", "public", 0.5);
     *
     * */
    async findCreditsRecords(creditAmounts: number[], unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext[] | Error> {
        let startHeight = 0;
        let endHeight = 0;

        if (searchParameters) {
            if (searchParameters["startHeight"] && typeof searchParameters["endHeight"] == "number") {
                startHeight = searchParameters["startHeight"];
            }

            if (searchParameters["endHeight"] && typeof searchParameters["endHeight"] == "number") {
                endHeight = searchParameters["endHeight"];
            } else {
                const end = await this.networkClient.getLatestHeight();
                if (end instanceof Error) {
                    console.error("Error getting latest height", end);
                    throw "Unable to get current block height"
                }
                endHeight = end;
            }
        }

        return await this.networkClient.findUnspentRecords(startHeight, endHeight, this.account.privateKey(), creditAmounts, undefined, nonces);
    }

    /**
     * Find a credit record with a given number of microcredits by via the official Aleo API
     *
     * @param microcredits {number} The number of microcredits to search for
     * @param unspent {boolean} Whether or not the record is unspent
     * @param nonces {string[]} Nonces of records already found so they are not found again
     * @param searchParameters {RecordSearchParams} Additional parameters to search for
     * @returns {Promise<RecordPlaintext | Error>} The record if found, otherwise an error
     */
    async findCreditsRecord(creditAmount: number, unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext | Error> {
        const records = await this.findCreditsRecords([creditAmount], unspent, nonces, searchParameters);
        if (!(records instanceof Error) && records.length > 0) {
            return records[0];
        }
        console.error("Record not found with error:", records);
        return new Error("Record not found");
    }

    /**
     * Find an arbitrary record. WARNING: This function is not implemented yet and will throw an error.
     */
    async findRecord(unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext | Error> {
        throw new Error("Method not implemented.");
    }

    /**
     * Find multiple arbitrary records. WARNING: This function is not implemented yet and will throw an error.
     */
    async findRecords(unspent: boolean, nonces?: string[], searchParameters?: RecordSearchParams): Promise<RecordPlaintext[] | Error> {
        throw new Error("Method not implemented.");
    }

}

/**
 * BlockHeightSearch is a RecordSearchParams implementation that allows for searching for records within a given
 * block height range.
 *
 * @example
 * // Create a new BlockHeightSearch
 * const params = new BlockHeightSearch(89995, 99995);
 *
 * // Create a new NetworkRecordProvider
 * const networkClient = new AleoNetworkClient("https://vm.aleo.org/api");
 * const keyProvider = new AleoKeyProvider();
 * const recordProvider = new NetworkRecordProvider(account, networkClient);
 *
 * // The record provider can be used to find records with a given number of microcredits and the block height search
 * // can be used to find records within a given block height range
 * const record = await recordProvider.findCreditsRecord(5000, true, [], params);
 *
 */
class BlockHeightSearch implements RecordSearchParams {
    startHeight: number;
    endHeight: number;
    constructor(startHeight: number, endHeight: number) {
        this.startHeight = startHeight;
        this.endHeight = endHeight;
    }
}

export { BlockHeightSearch, NetworkRecordProvider, RecordProvider, RecordSearchParams};