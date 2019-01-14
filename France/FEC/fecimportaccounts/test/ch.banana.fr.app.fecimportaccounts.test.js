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


// @id = ch.banana.fr.app.fecimportaccounts.test
// @api = 1.0
// @pubdate = 2019-01-14
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.fr.app.fecimportaccounts.js>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.fr.app.fecimportaccounts.js
// @timeout = -1


var texts;

// Register test case to be executed
Test.registerTestCase(new ImportAccountsTest());

// Here we define the class, the name of the class is not important
function ImportAccountsTest() {

}

// This method will be called at the beginning of the test case
ImportAccountsTest.prototype.initTestCase = function() {

}

// This method will be called at the end of the test case
ImportAccountsTest.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
ImportAccountsTest.prototype.init = function() {

}

// This method will be called after every test method is executed
ImportAccountsTest.prototype.cleanup = function() {

}

ImportAccountsTest.prototype.testBananaApps = function() {

    var file = Banana.IO.getLocalFile("file:script/../test/testcases/sirenFEC20190109.txt");
    var stringifyFile = JSON.stringify(file.read(), "", "");
    var parsedFile = JSON.parse(stringifyFile);
    Test.logger.addCsv("----INITIAL TXT FILE----", parsedFile);

    var csvFile = Banana.Converter.csvToArray(parsedFile, '\t', '');
    Test.logger.addText("----CONVERSION TXT TO ARRAY----");
    Test.logger.addText(csvFile);

    var form = [];
    loadForm(csvFile, form);
    var importAccountsFile = createImportAccountsFile(form);
    Test.logger.addText("------IMPORT ACCOUNTS FILE------");
    Test.logger.addText(importAccountsFile);

}

