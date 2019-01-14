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
// @id = ch.banana.fr.app.fecimportaccounts.js
// @api = 1.0
// @pubdate = 2019-01-14
// @publisher = Banana.ch SA
// @description.en = Fichiers des écritures comptables (FEC) - Import Accounts (text file *.txt)
// @description.fr = Fichiers des écritures comptables (FEC) - Importation des comptes (fichier de texte *.txt)
// @doctype = *
// @encoding = utf-8
// @task = import.accounts
// @outputformat = tablewithheaders
// @inputdatasource = openfiledialog
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


// Main function
function exec(inData) {

    if (!Banana.document) {
      return "@Cancel";
    }

    // 1. Get the txt file and convert to array
    var csvFile = Banana.Converter.csvToArray(inData, '\t', '');

    // 2. Load the form
    var form = []; // {"Section":"", "Group":"", "Account":"", "Description":"", "BClass":"", "Gr":""}
    loadForm(csvFile, form);

    // 3. Create the file used to import in Banana
    var importAccountsFile = createImportAccountsFile(form);
    //Banana.console.log(importAccountsFile);

    return importAccountsFile;
}

// Load the form that contains all the data used to import
function loadForm(csvFile, form) {

    // Get all the accounts from the txt file
    var accounts = getAccountsFromTxt(csvFile);

    // For each account set the columns values (Group, Account, Description, BClass, Gr)
    for (var i = 0; i < accounts.length; i++) {
        var accountNumber = "";
        var accountDescription = "";
        var bclass = "";
        var gr = "";
        accountNumber = accounts[i].split('&$&')[0]; // i.e. "1000&$&Cash" => "1000"
        accountDescription = accounts[i].split('&$&')[1]; // i.e. "1000&$&Cash" => "Cash"
        bclass = setBclassByAccount(accountNumber);
        gr = setGrByAccount(accountNumber,2);

        // Add accounts rows
        form.push({"Section":"", "Group":"", "Account":accountNumber, "Description":accountDescription, "BClass":bclass, "Gr":gr});
    }
    //Banana.console.log(JSON.stringify(form, "",""));
}

// Create the import text file that is used to import the accounts table in Banana
function createImportAccountsFile(form) {
    var textCsvFile = "";

    // Header
    textCsvFile += "Section\tGroup\tAccount\tDescription\tBClass\tGr\n";
    
    // Rows with data
    for (var i = 0; i < form.length; i++) {
        textCsvFile += form[i].Section+"\t"+form[i].Group+"\t"+form[i].Account+"\t"+form[i].Description+"\t"+form[i].BClass+"\t"+form[i].Gr+"\n";
    }
    //Banana.console.log(textCsvFile);
    return textCsvFile;    
}

// Return an array with all accounts and description (i.e. "1000&$&Cash") from the txt file.
// Removes duplicates and sort.
function getAccountsFromTxt(csvFile) {
    var accountsList = [];
    for (var i = 1; i < csvFile.length; i++) {
        if (csvFile[i][4] && csvFile[i][5]) {
            accountsList.push(csvFile[i][4]+"&$&"+csvFile[i][5]);
        }
    }
    // Removing duplicates
    for (var i = 0; i < accountsList.length; i++) {
        for (var x = i+1; x < accountsList.length; x++) {
            if (accountsList[x] === accountsList[i]) {
                accountsList.splice(x,1);
                --x;
            }
        }
    }
    accountsList.sort();
    //Banana.console.log(accountsList);
    return accountsList;
}

// Return the group (Gr) for the given account
function setGrByAccount(account, digits) {
    var gr = account.substring(0,digits);
    return gr;
}

// Return the BClass for the given account
function setBclassByAccount(account) {
    var bclass = "";
    var firstDigit = account.substring(0,1);

    if (firstDigit == "1") { // Liabilities: Gr=10
        bclass = "2"
    }
    else if (firstDigit == "2") { // Assets: Gr=20
        bclass = "1";
    }
    else if (firstDigit == "3") { // Assets: Gr=30
        bclass = "1";
    }
    else if (firstDigit == "4") { // Liabilities: Gr=40
        bclass = "2";
    }
    else if (firstDigit == "5") { // Assets: Gr=50
        bclass = "1";
    }
    else if (firstDigit == "6") { // Expenses: Gr=60
        bclass = "3";
    }
    else if (firstDigit == "7") { // Revenue: Gr=70
        bclass = "4";
    }
    else {
        bclass = "";
    }
    //Banana.console.log(bclass);
    return bclass;
}

