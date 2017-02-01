var signin = function (browser, credentials) {

  browser
  .url(browser.launchUrl + '/homepage')
  // wait for homepage to be present before starting
  .waitForElementPresent('.LandingPage', 5000, 'Expected landing page to be present')

  // wait for login form to be present
  .waitForElementPresent('#auth-signin', 5000, 'Expected signin form to become visible')

    /*
  //todo - submit and test for errors
  // try submitting with no credentials
  .submitForm('#auth-signin')
  // expect 1 error, missing credentials
  .waitForElementPresent('.error.visible', 5000, 'expect error to become visible')
  .assert.countelements('.error.visible', 1)
  // try with bad credentials
  .clearValue('#auth-signin input:nth-of-type(1)')
  .setValue('#auth-signin input:nth-of-type(1)', 'billgates@microsoft.com')
  .clearValue('#auth-signin input:nth-of-type(2)')
  .setValue('#auth-signin input:nth-of-type(2)', credentials.password)
  .submitForm('#auth-signin')
  // expect 1 error, bad credentials
  .waitForElementPresent('.error.visible', 5000, 'expect error to appear')
  .assert.countelements('.error.visible', 1)
  // try correct credentials
  .clearValue('#auth-signin input:nth-of-type(1)')
  .setValue('#auth-signin input:nth-of-type(1)', credentials.email)
  .submitForm('#auth-signin')
  */
  .setValue('#auth-signin input[name="email"]', credentials.email)
  .setValue('#auth-signin input[name="password"]', credentials.password)
  .waitForElementNotPresent('.Modal-action.disabled', 1000, 'modal button should be enabled')
  .click('.Modal-action')
  .waitForElementNotPresent('#auth-signin', 5000, 'form should be dismissed on successful login');
};

module.exports = signin;
