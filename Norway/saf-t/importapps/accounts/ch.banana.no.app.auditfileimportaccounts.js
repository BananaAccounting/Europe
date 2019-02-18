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
// @id = ch.banana.no.app.auditfileimportaccounts.js
// @api = 1.0
// @pubdate = 2019-02-18
// @publisher = Banana.ch SA
// @description = Auditfile NOR - Import Accounts (BETA)
// @doctype = *
// @encoding = utf-8
// @task = import.accounts
// @outputformat = tablewithheaders
// @inputdatasource = openfiledialog
// @inputencoding = utf-8
// @inputfilefilter = XML files (*.xml);;All files (*.*)

/*
*   SUMMARY
*
*   Import the accounts taken from the xml file.
*   Accounts that already exist are not imported.
*
*/

// Main function
function exec(inData) {

    if (!Banana.document) {
      return "@Cancel";
    }

    // Load the form with all the accounts row data
    var form = [];
    loadForm(inData,form);

    // Create the file used to import in Banana
    var importAccountsFile = createImportAccountsFile(form);

    return importAccountsFile;
}

// Load the form that contains all the data used to import
function loadForm(inData, form) {

    /* Read the xml file and extract accounts data (account and description) */
    var xmlFile = Banana.Xml.parse(inData);
    var xmlRoot = xmlFile.firstChildElement('n1:AuditFile');
    var masterFilesNode = xmlRoot.firstChildElement('n1:MasterFiles');

    //*****************
    // IMPORT ACCOUNTS 
    //*****************
    var generalLedgerAccountsNode = masterFilesNode.firstChildElement('n1:GeneralLedgerAccounts');
    var accountNode = generalLedgerAccountsNode.firstChildElement('n1:Account'); // First ledgerAccount
    loadAccounts(form, accountNode);

    //******************
    // IMPORT CUSTOMERS
    //******************
    var customersNode = masterFilesNode.firstChildElement('n1:Customers');
    var customerNode = customersNode.firstChildElement('n1:Customer');// First customer
    loadCustomersSuppliers(form, customerNode, "n1:Customer");

    //******************
    // IMPORT SUPPLIERS
    //******************
    var suppliersNode = masterFilesNode.firstChildElement('n1:Suppliers');
    var supplierNode = suppliersNode.firstChildElement('n1:Supplier');// First supplier
    loadCustomersSuppliers(form, supplierNode, "n1:Supplier");


    //Banana.console.log(JSON.stringify(form, "", " "));
}


function loadAccounts(form, accountNode) {

    while (accountNode) { // For each accountNode

        var accountNumber = accountNode.firstChildElement('n1:AccountID').text;
        var accountDescription = accountNode.firstChildElement('n1:AccountDescription').text;
        var gr = ""; //accountNode.firstChildElement('n1:StandardAccountID').text;
        //var accountType = accountNode.firstChildElement('n1:AccountType').text; //it is always "GL" (generla ledger)
        var bclass = setBClassByAccount(accountNumber);
        var accountOpening = "";
        
        if (accountNode.hasChildElements('n1:OpeningDebitBalance') || accountNode.hasChildElements('n1:OpeningCreditBalance')) {
            if (accountNode.hasChildElements('n1:OpeningDebitBalance')) {
                accountOpening = accountNode.firstChildElement('n1:OpeningDebitBalance').text;
            } else if (accountNode.hasChildElements('n1:OpeningCreditBalance')) {
                var openingValue = accountNode.firstChildElement('n1:OpeningCreditBalance').text;
                if (openingValue !== "0") {
                    accountOpening = Banana.SDecimal.invert(accountNode.firstChildElement('n1:OpeningCreditBalance').text);
                } else {
                    accountOpening = openingValue; // 0
                }
            }
        }

        form.push({
            "Section":"",
            "Group":"",
            "Account":accountNumber,
            "Description":accountDescription,
            "BClass":bclass,
            "Gr":gr,
            "Opening":accountOpening,
            "NamePrefix":"",
            "FirstName":"",
            "FamilyName":"",
            "Street":"",
            "PostalCode":"",
            "Locality":"",
            "CountryCode":"",
            "PhoneMain":"",
            "Fax":"",
            "EmailWork":"",
            "Website":"",
            "BankIban":""
        });
        accountNode = accountNode.nextSiblingElement('n1:Account'); // Next account
    }
}


function loadCustomersSuppliers(form, xmlNode, xmlTagName) {

    while (xmlNode) { // For each customer/supplier
        var accountNumber = xmlNode.firstChildElement(xmlTagName+"ID").text;
        var accountNumber1 = xmlNode.firstChildElement('n1:AccountID').text; //General ledger account code/number for this customer. This is the account code/number into where this sub account/accounts receivable is consolidated in the balance sheet.
        var accountDescription = xmlNode.firstChildElement('n1:Name').text;
        var bclass = setBClassByAccount(accountNumber);
        var gr = "";
        var accountOpening = "";

        if (xmlNode.hasChildElements('n1:OpeningDebitBalance') || xmlNode.hasChildElements('n1:OpeningCreditBalance')) {
            if (xmlNode.hasChildElements('n1:OpeningDebitBalance')) {
                accountOpening = xmlNode.firstChildElement('n1:OpeningDebitBalance').text;
            } else if (xmlNode.hasChildElements('n1:OpeningCreditBalance')) {
                var openingValue = xmlNode.firstChildElement('n1:OpeningCreditBalance').text;
                if (openingValue !== "0") {
                    accountOpening = Banana.SDecimal.invert(xmlNode.firstChildElement('n1:OpeningCreditBalance').text);
                } else {
                    accountOpening = openingValue; // 0
                }
            }
        }

        var addressNode = xmlNode.firstChildElement('n1:Address');
        while (addressNode) { // For each address
            if (addressNode.hasChildElements('n1:AddressType')) {
                if (addressNode.firstChildElement('n1:AddressType').text === "StreetAddress") {
                    var street = addressNode.firstChildElement('n1:StreetName').text;
                    var zip = addressNode.firstChildElement('n1:PostalCode').text;
                    var locality = addressNode.firstChildElement('n1:City').text;
                    var countryCode = addressNode.firstChildElement('n1:Country').text;
                    break;
                }
            }
            addressNode = addressNode.nextSiblingElement('n1:Customer'); // Next customer
        }

        var contactNode = xmlNode.firstChildElement('n1:Contact');
        var contactPersonNode = contactNode.firstChildElement('n1:ContactPerson');
        if (contactPersonNode.hasChildElements('n1:Salutation')) {
            var nameprefix = contactPersonNode.firstChildElement('n1:Salutation').text;
        } else {
            var nameprefix = "";
        }        
        var firstname = contactPersonNode.firstChildElement('n1:FirstName').text;
        var familyname = contactPersonNode.firstChildElement('n1:LastName').text;
        var phoneMain = contactNode.firstChildElement('n1:Telephone').text;
        var fax = contactNode.firstChildElement('n1:Fax').text;
        var email  = contactNode.firstChildElement('n1:Email').text;
        var website = contactNode.firstChildElement('n1:Website').text;

        var bankAccountNode = xmlNode.firstChildElement('n1:BankAccount');
        if (bankAccountNode.hasChildElements('n1:IBANNumber')) {
            var bankiban = bankAccountNode.firstChildElement('n1:IBANNumber').text;
        } else {
            var bankiban = "";
        }

        form.push({
            "Section":"",
            "Group":"",
            "Account":accountNumber,
            "Description":accountDescription,
            "BClass":bclass,
            "Gr":gr,
            "Opening":accountOpening,
            "NamePrefix":nameprefix,
            "FirstName":firstname,
            "FamilyName":familyname,
            "Street":street,
            "PostalCode":zip,
            "Locality":locality,
            "CountryCode":countryCode,
            "PhoneMain":phoneMain,
            "Fax":fax,
            "EmailWork":email,
            "Website":website,
            "BankIban":bankiban
        });

        xmlNode = xmlNode.nextSiblingElement(xmlTagName); // Next customer/supplier
    }
}

// Create the import text file that is used to import the accounts table in Banana
function createImportAccountsFile(form) {
    var importAccountsFile = "";

    // Header
    importAccountsFile += 
        "Section\t"+
        "Group\t"+
        "Account\t"+
        "Description\t"+
        "BClass\t"+
        "Gr\t"+
        "Opening\t"+
        "NamePrefix\t"+
        "FirstName\t"+
        "FamilyName\t"+
        "Street\t"+
        "PostalCode\t"+
        "Locality\t"+
        "CountryCode\t"+
        "PhoneMain\t"+
        "Fax\t"+
        "EmailWork\t"+
        "Website\t"+
        "BankIban\n";
    
    // Rows with data
    for (var i = 0; i < form.length; i++) {
        importAccountsFile += 
            form[i].Section+"\t"+
            form[i].Group+"\t"+
            form[i].Account+"\t"+
            form[i].Description+"\t"+
            form[i].BClass+"\t"+
            form[i].Gr+"\t"+
            form[i].Opening+"\t"+
            form[i].NamePrefix+"\t"+
            form[i].FirstName+"\t"+
            form[i].FamilyName+"\t"+
            form[i].Street+"\t"+
            form[i].PostalCode+"\t"+
            form[i].Locality+"\t"+
            form[i].CountryCode+"\t"+
            form[i].PhoneMain+"\t"+
            form[i].Fax+"\t"+
            form[i].EmailWork+"\t"+
            form[i].Website+"\t"+
            form[i].BankIban+"\n";
    }

    //Banana.console.log(importAccountsFile);
    return importAccountsFile;    
}


// Return the group (Gr) for the given account
function setGrByAccount(account) {
    var gr = "";
    //....
    return gr;
}

// Return the BClass for the given account
function setBClassByAccount(account) {
    
    /*  
        Groups:
        1 Assets
        2 Equity and liabilities
        3 Sales and Operating income
        4 Cost of goods
        5 Labor costs
        6 and 7 Other operating expenses, write-downs
        8 Financial income and cost, extra words. Income and cost
    */
    
    var bclass = "";
    if (account.substring(0,1) === "1") {
        bclass = 1;
    }
    else if (account.substring(0,1) === "2") {
        bclass = 2;
    }
    else if (account.substring(0,1) === "3") {
        bclass = 4;
    }
    else if (account.substring(0,1) === "4" || account.substring(0,1) === "5" || account.substring(0,1) === "6" || account.substring(0,1) === "7") {
        bclass = 3;
    }
    else if (account.substring(0,1) === "8") {
        //bclass 3 or 4
        bclass = "";
    }
    return bclass;
}

