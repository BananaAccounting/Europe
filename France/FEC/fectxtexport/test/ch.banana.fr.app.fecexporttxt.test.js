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


// @id = ch.banana.fr.app.fecexporttxt.test
// @api = 1.0
// @pubdate = 2019-01-08
// @publisher = Banana.ch SA
// @description = <TEST ch.banana.fr.app.fecexporttxt.js>
// @task = app.command
// @doctype = *.*
// @docproperties = 
// @outputformat = none
// @inputdataform = none
// @includejs = ../ch.banana.fr.app.fecexporttxt.js
// @timeout = -1


var texts;

// Register test case to be executed
Test.registerTestCase(new TxtExportTest());

// Here we define the class, the name of the class is not important
function TxtExportTest() {

}

// This method will be called at the beginning of the test case
TxtExportTest.prototype.initTestCase = function() {

}

// This method will be called at the end of the test case
TxtExportTest.prototype.cleanupTestCase = function() {

}

// This method will be called before every test method is executed
TxtExportTest.prototype.init = function() {

}

// This method will be called after every test method is executed
TxtExportTest.prototype.cleanup = function() {

}

TxtExportTest.prototype.testBananaApps = function() {
  
  var file = "file:script/../test/testcases/exemple_cd_entreprise.ac2";
  var banDoc = Banana.application.openDocument(file);
  Test.assert(banDoc);

  var txtFile = getDataType1(banDoc, '2019-01-01', '2019-12-31');

  Test.logger.addCsv("TXT FILE CONTENT...", txtFile);
}

