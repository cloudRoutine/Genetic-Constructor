var homepageRegister = require('../fixtures/homepage-register');
var signout = require('../fixtures/signout');
var signin = require('../fixtures/signin');
var dragFromTo = require('../fixtures/dragfromto');
var newProject = require('../fixtures/newproject');
var newConstruct = require('../fixtures/newconstruct');
var clickMainMenu = require('../fixtures/click-main-menu');

module.exports = {
  'Test undo / redo after copying a construct' : function (browser) {

    // maximize for graphical tests
    browser.windowSize('current', 1200, 900);

    // register via fixture
    var credentials = homepageRegister(browser);

    // now we can go to the project page
    browser
      .url('http://localhost:3001/project/test')
      // wait for inventory and inspector to be present
      .waitForElementPresent('.SidePanel.Inventory', 5000, 'Expected Inventory Groups')
      .waitForElementPresent('.SidePanel.Inspector', 5000, 'Expected Inspector')
      // expect to start with 8 blocks
      .assert.countelements('.sbol-glyph', 8)
      // send select all
      .keys([browser.Keys.COMMAND, 'a'])
      .pause(1000)
      // send copy
      .keys([browser.Keys.NULL, browser.Keys.COMMAND, 'c'])
      .pause(1000)
      // send new construct
      .keys([browser.Keys.NULL, browser.Keys.SHIFT, browser.Keys.CONTROL, 'n'])
      .pause(1000)
      // paste
      .keys([browser.Keys.NULL, browser.Keys.COMMAND, 'v'])
      .pause(1000)
      // should now have 16 blocks
      .assert.countelements(".sbol-glyph", 16)
      // undo
      .keys([browser.Keys.NULL, browser.Keys.COMMAND, 'z'])
      .pause(1000)
      // back to 8 blocks
      .assert.countelements(".sbol-glyph", 8)
      // redo
      .keys([browser.Keys.NULL, browser.Keys.SHIFT, browser.Keys.COMMAND, 'z'])
      .pause(1000)
      // back to 16 blocks
      .assert.countelements(".sbol-glyph", 16)

      .end();
  }
};