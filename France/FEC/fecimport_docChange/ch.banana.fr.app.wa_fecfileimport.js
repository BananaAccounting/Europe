// Copyright [2018] [Banana.ch SA - Lugano Switzerland]
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// @id = ch.banana.fr.app.fecfileimport.js
// @api = 1.0
// @pubdate = 2021-10-19
// @publisher = Banana.ch SA
// @description = Importation de fichiers d'enregistrements comptables (FEC) 
// @description.fr = Importation de fichiers d'enregistrements comptables (FEC)
// @doctype = *
// @encoding = utf-8
// @task = import.file
// @inputencoding = utf-8
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)

/*
 *   SUMMARY
 *
 *   Import the accounts taken from the txt file.
 *   Accounts that already exist are not imported.
 *
 *   For the "BClass" we followed the accounting plan schema on page: https://fr.wikipedia.org/wiki/Plan_comptable_g%C3%A9n%C3%A9ral_(France)
 *   
 *   BClass 1: Assets        => accounts: 2xxxx, 3xxxx, 5xxxx
 *   BClass 2: Liabilities   => accounts: 1xxxx, 4xxxx
 *   BClass 3: Expenses      => accounts: 6xxxx
 *   BClass 4: Income        => accounts: 7xxxx
 *
 *   1   2   3   4   5   6   7
 *   P   A   A   P   A   C   R
 *
 *   For the "Gr" we take the first two digits of the account number.
 *
 */

/**
 * function called from converter
 */
function setup() {}

var FrAuditFilesImport = class FrAuditFilesImport {
    constructor(banDocument) {
        this.version = '1.0';
        this.isAdvanced = true; //this.isBananaAdvanced();
        this.banDocument = banDocument;
        this.gr = "";
        this.bClass = "";

        //array dei patches
        this.jsonDocArray = [];

        //errors
        this.ID_ERR_LICENSE_NOTVALID = "ID_ERR_LICENSE_NOTVALID";
        this.ID_ERR_VERSION_NOTSUPPORTED = "ID_ERR_VERSION_NOTSUPPORTED";

    }

    /**
     * Il metodo createJsonDocument() riprende i dati dal file xml e li trasforma
     * in formato json per essere importati nella tabella Registrazioni
     * @param {*} inData 
     */
    createJsonDocument(inData) {

        var jsonDoc = this.createJsonDocument_Init();
        var lang = this.getLang();


        //import Accounts
        this.createJsonDocument_AddAccounts(jsonDoc, inData);
        //import Transactions
        this.createJsonDocument_AddTransactions(jsonDoc, inData);
        //Company Info's-->Not available in this kind of file
        //customers and suppliers are available in separated files from the one with the transactions, currently we do not have those files.

        this.jsonDocArray.push(jsonDoc);

    }

    createJsonDocument_AddTransactions(jsonDoc, inData) {

        var rows = [];
        var jContraAccountGroup = [];
        var transactionsRows = inData;
        jContraAccountGroup = this.getJContraAccounGroups(transactionsRows);

        var transactions = [];
        for (var i = 0; i < jContraAccountGroup.length; i++) {
            transactions.push(this.getByValue(transactionsRows, jContraAccountGroup[i]));
        }

        for (var i = 0; i < transactions.length; i++) {
            var date = "";
            var description = "";
            var accountDebit = "";
            var accountCredit = "";
            var debitAmount = "";
            var transNr = "";
            var creditAmount = "";
            var amount = "";

            var checkDebitAmount = "";
            var checkCreditAmount = "";

            //The transaction is on more then 2 lines: 3+ rows from the journal
            if (transactions[i].length > 2) {
                for (var j = 0; j < transactions[i].length; j++) {
                    date = this.formatDate(transactions[i][j][3]);
                    description = transactions[i][j][10];
                    transNr = transactions[i][j][2];
                    //il montante è a debito 
                    if (transactions[i][j][4] && transactions[i][j][11]) {
                        accountDebit = transactions[i][j][4];
                        accountCredit = "";
                        debitAmount = transactions[i][j][11];

                        //create and add the transaction line
                        var row = this.getTransactionRow(date, transNr, description, accountDebit, accountCredit, debitAmount);
                        rows.push(row);

                        checkDebitAmount = Banana.SDecimal.add(checkDebitAmount, debitAmount);
                        //il montante è a credito 
                    } else if (transactions[i][j][4] && transactions[i][j][12]) {
                        accountDebit = "";
                        accountCredit = transactions[i][j][4];
                        creditAmount = transactions[i][j][12];

                        //create and add the transaction line
                        var row = this.getTransactionRow(date, transNr, description, accountDebit, accountCredit, creditAmount);
                        rows.push(row);

                        checkCreditAmount = Banana.SDecimal.add(checkCreditAmount, creditAmount);
                    }
                }

                if (checkDebitAmount !== checkCreditAmount) {
                    Banana.document.addMessage("Debit amount != Credit amount!!!");
                }

            }
            //The transaction is on one line: 2 rows from the journal
            else {
                for (var j = 0; j < transactions[i].length; j++) {
                    var date = this.formatDate(transactions[i][j][3]);
                    var description = transactions[i][j][10];
                    transNr = transactions[i][j][2];
                    if (transactions[i][j][4] && transactions[i][j][11]) {
                        var accountDebit = transactions[i][j][4];
                        var debitAmount = Banana.SDecimal.add(debitAmount, transactions[i][j][11]);
                    } else if (transactions[i][j][4] && transactions[i][j][12]) {
                        var accountCredit = transactions[i][j][4];
                        var creditAmount = Banana.SDecimal.add(creditAmount, transactions[i][j][12]);
                    }
                }
                //create and add the transaction line
                var row = this.getTransactionRow(date, transNr, description, accountDebit, accountCredit, debitAmount);
                rows.push(row);

                if (debitAmount !== creditAmount) {
                    Banana.document.addMessage("Debit amount != Credit amount!!!");
                }
            }

        }

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Transactions";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


    }

    createJsonDocument_AddAccounts(jsonDoc, inData) {

        var rows = [];
        var transactionsRows = inData;

        var accounts = this.getAccountsList(transactionsRows);

        for (var i = 0; i < accounts.length; i++) {

            var accountNumber = "";
            var accountDescription = "";
            var bClass = "";
            var gr = "";

            accountNumber = accounts[i].split('&$&')[0]; // i.e. "1000&$&Cash" => "1000"
            accountDescription = accounts[i].split('&$&')[1]; // i.e. "1000&$&Cash" => "Cash"
            bClass = this.setBclassByAccount(accountNumber);
            gr = this.setGrByAccount(accountNumber, 2);


            //if changes group, add a grouping row
            if (this.gr != gr) {
                //normal groups
                var grRows = this.getGroupRow();
                rows.push(grRows.row);
                rows.push(grRows.emptyRow);

                //carried over groups
                var grCarriedOver = this.getGroupCarriedOver();
                var grCarrOverRows = this.getGroupRow_carriedOver(grCarriedOver);
                rows.push(grCarrOverRows.row);
            }

            //if changes bclass, add section group row
            if (this.bClass != bClass) {
                var secRows = this.getSectionRow();
                rows.push(secRows.row);
                rows.push(secRows.emptyRow);
            }


            var row = {};
            row.operation = {};
            row.operation.name = "add";
            row.fields = {};
            row.fields["Account"] = accountNumber;
            row.fields["Description"] = accountDescription;
            row.fields["BClass"] = bClass;
            row.fields["Gr"] = gr;

            rows.push(row);

            this.gr = gr;
            this.bClass = bClass;

        }

        //last group
        var grRows = this.getGroupRow();
        rows.push(grRows.row);
        rows.push(grRows.emptyRow);
        //last section
        var secRows = this.getSectionRow()
        rows.push(secRows.row);
        rows.push(secRows.emptyRow);

        //add Profit and Loss Group Total
        var totCeRow = this.getTotCeRow();
        rows.push(totCeRow.row);
        rows.push(totCeRow.emptyRow);

        //Add Balance Group Total
        var balanceDiff = this.getBalanceDiff();
        rows.push(balanceDiff.row);
        rows.push(balanceDiff.emptyRow);

        var dataUnitFilePorperties = {};
        dataUnitFilePorperties.nameXml = "Accounts";
        dataUnitFilePorperties.data = {};
        dataUnitFilePorperties.data.rowLists = [];
        dataUnitFilePorperties.data.rowLists.push({ "rows": rows });

        jsonDoc.document.dataUnits.push(dataUnitFilePorperties);


    }

    checkIfAccountExists(existingAccounts, accountNumber, accountAlreadyExistent) {
        for (var row in existingAccounts) {
            var account = existingAccounts[row];
            if (account.accountNr == accountNumber) {
                accountAlreadyExistent = true;
                return accountAlreadyExistent;
            }
        }
        return accountAlreadyExistent;
    }


    getAccountsTableRow() {

        var table = Banana.document.table("Accounts");
        if (!table) {
            return;
        }

        var accountRows = [];

        for (var i = 0; i < table.rowCount; i++) {
            let tRow = table.row(i);

            if (tRow.value("Account")) {
                var account = {};
                account.accountNr = tRow.value("Account");
                account.rowNr = tRow.rowNr;
                accountRows.push(account);
            }

        }
        return accountRows;
    }

    getTransactionRow(date, transNr, description, accountDebit, accountCredit, amount) {
        var row = {};
        row.operation = {};
        row.operation.name = "add";
        row.fields = {};
        row.fields["Date"] = date;
        row.fields["Doc"] = transNr;
        row.fields["Description"] = description;
        row.fields["AccountDebit"] = accountDebit;
        row.fields["AccountCredit"] = accountCredit;
        row.fields["Amount"] = amount;

        return row;
    }

    getGroupCarriedOver() {
        var grCarriedOver = {};
        switch (this.gr) {
            case "2":
                grCarriedOver.gr = "120000"
                grCarriedOver.description = "Résultat net d'exércice (Bénéfice ou perte)";
                return grCarriedOver;
            default:
                return null;
        }
    }

    getGroupRow_carriedOver(grCarriedOver) {
        var grRows = {};
        if (grCarriedOver) {
            grRows.row = {};
            grRows.row.operation = {};
            grRows.row.operation.name = "add";
            grRows.row.fields = {};
            grRows.row.fields["Group"] = grCarriedOver.gr;
            grRows.row.fields["Description"] = grCarriedOver.description;
            grRows.row.fields["Gr"] = this.bClass;
        }
        return grRows;
    }

    getGroupRow() {
        var grRows = {};
        grRows.row = {};
        grRows.row.operation = {};
        grRows.row.operation.name = "add";
        grRows.row.fields = {};
        grRows.row.fields["Group"] = this.gr;
        grRows.row.fields["Description"] = "Total Group: " + this.gr;
        grRows.row.fields["Gr"] = this.getGroupTotal(this.bClass);
        grRows.emptyRow = this.getEmptyRow();

        return grRows;
    }

    getSectionRow() {
        var secRows = {};
        secRows.row = {};
        secRows.row.operation = {};
        secRows.row.operation.name = "add";
        secRows.row.fields = {};
        var group = this.getGroupTotal(this.bClass);
        secRows.row.fields["Group"] = group;
        secRows.row.fields["Description"] = "Total Section: " + group;
        secRows.row.fields["Gr"] = this.getSectionGr();
        //create an empty row to append after the total row
        secRows.emptyRow = this.getEmptyRow();
        return secRows;
    }

    getGroupTotal() {
        var groupTotal = "";
        switch (this.bClass) {
            case "1":
                groupTotal = "A"
                return groupTotal;
            case "2":
                groupTotal = "P"
                return groupTotal;
            case "3":
                groupTotal = "C"
                return groupTotal;
            case "4":
                groupTotal = "R"
                return groupTotal;
            default:
                return groupTotal;
        }

    }

    getSectionGr() {
        var sectionTotal = "";
        switch (this.bClass) {
            case "1":
            case "2":
                sectionTotal = "00"
                return sectionTotal;
            case "3":
            case "4":
                sectionTotal = "02"
                return sectionTotal;
            default:
                return sectionTotal;
        }
    }

    getEmptyRow() {
        var emptyRow = {};
        emptyRow.operation = {};
        emptyRow.operation.name = "add";
        emptyRow.fields = {};

        return emptyRow;
    }

    /**
     * 
     * @param {*} transactionsRows 
     * @returns 
     */

    getAccountsList(transactionsRows) {
        var accountsList = [];
        for (var i = 1; i < transactionsRows.length; i++) {
            if (transactionsRows[i][4] && transactionsRows[i][5]) {
                accountsList.push(transactionsRows[i][4] + "&$&" + transactionsRows[i][5]);
            }
        }
        // Removing duplicates
        for (var i = 0; i < accountsList.length; i++) {
            for (var x = i + 1; x < accountsList.length; x++) {
                if (accountsList[x] === accountsList[i]) {
                    accountsList.splice(x, 1);
                    --x;
                }
            }
        }

        accountsList.sort();
        //Banana.console.log(accountsList);
        return accountsList;
    }

    setGrByAccount(account, digits) {
        var gr = account.substring(0, digits);
        return gr;
    }

    setBclassByAccount(account) {
        var bclass = "";
        var firstDigit = account.substring(0, 1);

        if (firstDigit == "1") { // Liabilities: Gr=10
            bclass = "2"
        } else if (firstDigit == "2") { // Assets: Gr=20
            bclass = "1";
        } else if (firstDigit == "3") { // Assets: Gr=30
            bclass = "1";
        } else if (firstDigit == "4") { // Liabilities: Gr=40
            bclass = "2";
        } else if (firstDigit == "5") { // Assets: Gr=50
            bclass = "1";
        } else if (firstDigit == "6") { // Expenses: Gr=60
            bclass = "3";
        } else if (firstDigit == "7") { // Revenue: Gr=70
            bclass = "4";
        } else {
            bclass = "";
        }
        //Banana.console.log(bclass);
        return bclass;
    }

    getBalanceDiff() {
        var balanceRows = {};
        balanceRows.row = {};
        balanceRows.row.operation = {};
        balanceRows.row.operation.name = "add";
        balanceRows.row.fields = {};
        balanceRows.row.fields["Group"] = "00";
        balanceRows.row.fields["Description"] = "Différence doit être = 0 (cellule vide)";
        balanceRows.emptyRow = this.getEmpty

        return balanceRows;
    }
    getTotCeRow() {
        var ceRows = {};
        ceRows.row = {};
        ceRows.row.operation = {};
        ceRows.row.operation.name = "add";
        ceRows.row.fields = {};
        ceRows.row.fields["Group"] = "02";
        ceRows.row.fields["Description"] = "Perte (+) Bénéfice (-) du Compte de Résultat";
        ceRows.row.fields["Gr"] = "12000";
        ceRows.emptyRow = this.getEmpty

        return ceRows;
    }

    getJContraAccounGroups(csvFile) {
        var values = [];
        for (var i = 1; i < csvFile.length; i++) {
            values.push(csvFile[i][2]); //third column = JContraAccountGroup
        }
        //Removing duplicates
        for (var i = 0; i < values.length; i++) {
            for (var x = i + 1; x < values.length; x++) {
                if (values[x] === values[i]) {
                    values.splice(x, 1);
                    --x;
                }
            }
        }
        return values;
    }

    getByValue(arr, value) {
        var x = [];
        for (var i = 0, iLen = arr.length; i < iLen; i++) {
            if (arr[i][2] == value) {
                x.push(arr[i]);
            }
        }
        return x;
    }

    formatDate(date) {
        return [date.slice(0, 4), "-", date.slice(4, 6), "-", date.slice(6, 8)].join('');
        // 20191231 => return 2019-12-31
    }

    createJsonDocument_Init() {

        var jsonDoc = {};
        jsonDoc.document = {};
        jsonDoc.document.dataUnitsfileVersion = "1.0.0";
        jsonDoc.document.dataUnits = [];

        jsonDoc.creator = {};
        var d = new Date();
        var datestring = d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
        var timestring = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        jsonDoc.creator.executionDate = Banana.Converter.toInternalDateFormat(datestring, "yyyymmdd");
        jsonDoc.creator.executionTime = Banana.Converter.toInternalTimeFormat(timestring, "hh:mm");
        jsonDoc.creator.name = Banana.script.getParamValue('id');
        jsonDoc.creator.version = "1.0";

        return jsonDoc;

    }

    getAccountingInfo() {
        this.accountingInfo = {};
        this.accountingInfo.isDoubleEntry = false;
        this.accountingInfo.isIncomeExpenses = false;
        this.accountingInfo.isCashBook = false;
        this.accountingInfo.multiCurrency = false;
        this.accountingInfo.withVat = false;
        this.accountingInfo.vatAccount = "";
        this.accountingInfo.customersGroup = "";
        this.accountingInfo.suppliersGroup = "";

        if (this.banDocument) {
            var fileGroup = this.banDocument.info("Base", "FileTypeGroup");
            var fileNumber = this.banDocument.info("Base", "FileTypeNumber");
            var fileVersion = this.banDocument.info("Base", "FileTypeVersion");

            if (fileGroup == "100")
                this.accountingInfo.isDoubleEntry = true;
            else if (fileGroup == "110")
                this.accountingInfo.isIncomeExpenses = true;
            else if (fileGroup == "130")
                this.accountingInfo.isCashBook = true;

            if (fileNumber == "110") {
                this.accountingInfo.withVat = true;
            }
            if (fileNumber == "120") {
                this.accountingInfo.multiCurrency = true;
            }
            if (fileNumber == "130") {
                this.accountingInfo.multiCurrency = true;
                this.accountingInfo.withVat = true;
            }

            if (this.banDocument.info("AccountingDataBase", "VatAccount"))
                this.accountingInfo.vatAccount = this.banDocument.info("AccountingDataBase", "VatAccount");

            if (this.banDocument.info("AccountingDataBase", "CustomersGroup"))
                this.accountingInfo.customersGroup = this.banDocument.info("AccountingDataBase", "CustomersGroup");
            if (this.banDocument.info("AccountingDataBase", "SuppliersGroup"))
                this.accountingInfo.suppliersGroup = this.banDocument.info("AccountingDataBase", "SuppliersGroup");
        }
    }

    getErrorMessage(errorId, lang) {
        if (!lang)
            lang = 'en';
        switch (errorId) {
            case this.ID_ERR_LICENSE_NOTVALID:
                // Banana.console.debug("advanced message: "+errorId);
                return "This extension requires Banana Accounting+ Advanced, the import of Transactions is limited to 100 Rows";
            case this.ID_ERR_VERSION_NOTSUPPORTED:
                return "This script does not run with your current version of Banana Accounting.\nMinimum version required: %1.\nTo update or for more information click on Help";
            default:
                return '';
        }
    }

    isBananaAdvanced() {
        // Starting from version 10.0.7 it is possible to read the property Banana.application.license.isWithinMaxRowLimits 
        // to check if all application functionalities are permitted
        // the version Advanced returns isWithinMaxRowLimits always false
        // other versions return isWithinMaxRowLimits true if the limit of transactions number has not been reached

        if (Banana.compareVersion && Banana.compareVersion(Banana.application.version, "10.0.9") >= 0) {
            var license = Banana.application.license;
            //Banana.console.debug(license.licenseType);
            //tolgo il license.isWithinMaxFreeLines perchè siccome il file inizialmente e vuoto mi darà sempre true.
            if (license.licenseType === "advanced") {
                return true;
            }
        }
        return false;
    }

    verifyBananaVersion() {
        if (!Banana.document)
            return false;

        var lang = this.getLang();

        //Banana+ is required
        var requiredVersion = "10.0.9";
        if (Banana.compareVersion && Banana.compareVersion(Banana.application.version, requiredVersion) < 0) {
            var msg = this.getErrorMessage(this.ID_ERR_VERSION_NOTSUPPORTED, lang);
            msg = msg.replace("%1", requiredVersion);
            this.banDocument.addMessage(msg, this.ID_ERR_VERSION_NOTSUPPORTED);
            return false;
        }
        return true;
    }

    getLang() {
        var lang = 'en';
        if (this.banDocument)
            lang = this.banDocument.locale;
        else if (Banana.application.locale)
            lang = Banana.application.locale;
        if (lang.length > 2)
            lang = lang.substr(0, 2);
        return lang;
    }
}

/**
 * The function findSeparator is used to find the field separator.
 */
function findSeparator(string) {

    var commaCount = 0;
    var semicolonCount = 0;
    var tabCount = 0;

    for (var i = 0; i < 1000 && i < string.length; i++) {
        var c = string[i];
        if (c === ',')
            commaCount++;
        else if (c === ';')
            semicolonCount++;
        else if (c === '\t')
            tabCount++;
    }

    if (tabCount > commaCount && tabCount > semicolonCount) {
        return '\t';
    } else if (semicolonCount > commaCount) {
        return ';';
    }

    return ',';
}

// Main function
function exec(inData) {

    //Get the txt file and convert to array
    var fieldSeparator = findSeparator(inData);
    var transactions = Banana.Converter.csvToArray(inData, '\t', '');


    var frAuditFilesImport = new FrAuditFilesImport(Banana.document);
    if (!frAuditFilesImport.verifyBananaVersion()) {
        return "@Cancel";
    }

    frAuditFilesImport.createJsonDocument(transactions);

    var jsonDoc = { "format": "documentChange", "error": "" };
    jsonDoc["data"] = frAuditFilesImport.jsonDocArray;

    return jsonDoc;
}