import app from '../support/app'

describe('Entry menu', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('opens and closes entry menu', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    const name1 = 'foo'
    const name2 = 'bar'

    // should close when clicking on entry
    app.entryMenu(name1)
    app.entry(name1).click()
    app.expectEntryMenuToBeClosed()

    // should close when toggling selection on entry
    app.entryMenu(name1)
    app.entrySelect(name1)
    app.expectEntryToBeNotSelected(name1)
    app.expectEntryMenuToBeClosed()

    // should close when clicking on another entry
    app.entryMenu(name1)
    app.entry(name2).click()
    app.expectEntryMenuToBeClosed()

    // should close when toggling selection on another entry
    app.entryMenu(name1)
    app.entrySelect(name2)
    app.expectEntryToBeNotSelected(name2)
    app.expectEntryMenuToBeClosed()

    // should deselect entries when opening a non-selected entry
    app.entrySelect(name1)
    app.entryMenu(name1)
    app.expectEntryToBeSelected(name1)
    app.entryMenu(name2)
    app.expectEntryToBeNotSelected(name1)
    app.entry(name2).click()

    // right click should open menu
    app.entry(name1).rightclick()
    app.expectEntryMenuToBeOpen()
    app.entry(name1).click()
    app.expectEntryMenuToBeClosed()

    // should update position when menu is already open
    app.entryMenu(name1)
    app.entryMenu(name2)
    app.entry(name1).rightclick()
    app.expectEntryMenuToBeOpen()
    app.entry(name2).rightclick()
    app.expectEntryMenuToBeOpen()
    app.entry(name2).click()
    app.expectEntryMenuToBeClosed()

    // esc should close the menu
    app.entryMenu(name1)
    cy.dataCy('entry-menu').type('{esc}')
    app.expectEntryMenuToBeClosed()

    // clicking outside should close the menu
    app.entryMenu(name1)
    app.fileName().click()
    app.expectEntryMenuToBeClosed()

    // when already open, trying to open again closes the menu
    app.entryMenu(name1)
    app.entry(name1).dataCy('entry-menu-open').click()
    app.expectEntryMenuToBeClosed()

    // should close when clicking on free space indicator in root directory
    app.entryMenu(name1)
    cy.dataCy('entry-up').click()
    app.expectEntryMenuToBeClosed()

    // should close first when clicking on up entry
    app.entry(name1).click()
    app.entryMenu('aaa-empty')
    cy.dataCy('entry-up').click()
    app.entryByName('aaa-empty').should('exist')
    app.expectEntryMenuToBeClosed()
    cy.dataCy('entry-up').click()

    // should close when going back in history or navigating via router
    app.entry(name1).click()
    app.entryMenu('aaa-empty')
    cy.go('back')
    app.expectEntryMenuToBeClosed()

    // should close menu first when clicking on toolbar items
    app.entryMenu(name1)
    app.newCard()
    app.entryByName(name1).should('exist')
  })
})

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}

