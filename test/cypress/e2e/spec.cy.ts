// Use `cy.dataCy` custom command for more robust tests
// See https://docs.cypress.io/guides/references/best-practices.html#Selecting-Elements

import app from '../support/app'

describe('Main', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.contains('No card loaded').should('exist')
  })

  it('creates and closes new memory card', () => {
    const assertIsNotLoaded = () => {
      cy.get('[data-cy="toolbar-vmc-new"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-open"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-saveAs"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-vmc-close"][disabled]').should('exist')

      cy.get('[data-cy="toolbar-import-files"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-import-psu"][disabled]').should('exist')
      cy.get('[data-cy="toolbar-mkdir"][disabled]').should('exist')

      cy.dataCy('toolbar-vmc-fileName').should('not.exist')
      cy.dataCy('toolbar-vmc-fileName-skeleton').should('exist')
      cy.get('[data-cy="toolbar-selectionToggle"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('not.exist')
      cy.dataCy('breadcrumbs-skeleton').should('exist')

      cy.contains('No card loaded')
    }

    const assertIsLoaded = () => {
      cy.get('[data-cy="toolbar-vmc-new"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-open"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-saveAs"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-vmc-close"]:not([disabled])').should('exist')

      cy.get('[data-cy="toolbar-import-files"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-import-psu"]:not([disabled])').should('exist')
      cy.get('[data-cy="toolbar-mkdir"]:not([disabled])').should('exist')

      cy.dataCy('toolbar-vmc-fileName').should('exist')
      cy.dataCy('toolbar-vmc-fileName-skeleton').should('not.exist')
      cy.get('[data-cy="toolbar-selectionToggle"][disabled]').should('exist')

      cy.dataCy('breadcrumbs-root').should('exist')
      cy.dataCy('breadcrumbs-skeleton').should('not.exist')

      cy.contains('No items').should('exist')
    }

    assertIsNotLoaded()
    app.newCard()
    assertIsLoaded()
    app.closeCard()
    assertIsNotLoaded()
  })

  it('opens memory card from file', () => {
    // without ECC
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')
    app.fileName().should('have.text', 'foo-bar-baz.mcd')
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
    app.closeCard()
    cy.contains('No card loaded')

    // with ECC
    app.openCardFromFixtures('cards/foo-bar-baz.ps2')
    app.fileName().should('have.text', 'foo-bar-baz.ps2')
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
  })

  it('saves memory card to file', () => {
    app.newCard()

    clearDownloads()
    app.saveCardWithoutEcc()
    compareDownloadWithFixture('ps2-memory-card.bin', 'cards/empty.mcd')

    clearDownloads()
    app.saveCardWithEcc()
    compareDownloadWithFixture('ps2-memory-card.bin', 'cards/empty.ps2')

    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    clearDownloads()
    app.saveCardWithoutEcc()
    compareDownloadWithFixture('foo-bar-baz.mcd', 'cards/foo-bar-baz.mcd')

    clearDownloads()
    app.saveCardWithEcc()
    compareDownloadWithFixture('foo-bar-baz.mcd', 'cards/foo-bar-baz.ps2')
  })

  it('imports .psu', () => {
    app.newCard()
    app.importPsuFromFixturesWithoutOverwrite('psu/foo-empty.psu')
    app.entry('foo').click()
    app.entry('aaa-empty').should('exist')
    app.entry('bbb-empty').should('exist')
    app.entry('ccc-empty').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-empty')
    app.saveEntryFromMenu('bbb-empty')
    app.saveEntryFromMenu('ccc-empty')
    compareDownloadWithFixture('aaa-empty', 'files/aaa-empty')
    compareDownloadWithFixture('bbb-empty', 'files/bbb-empty')
    compareDownloadWithFixture('ccc-empty', 'files/ccc-empty')

    app.deleteEntryFromMenu('ccc-empty')
    app.importPsuFromFixturesWithoutOverwrite('psu/foo-empty.psu')
    app.entry('aaa-empty').should('exist')
    app.entry('bbb-empty').should('exist')
    app.entry('ccc-empty').should('exist')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')

    app.importPsuFromFixturesWithoutOverwrite('psu/bar-unaligned.psu')
    app.entry('bar').click()
    app.entry('aaa-unaligned').should('exist')
    app.entry('bbb-unaligned').should('exist')
    app.entry('ccc-unaligned').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-unaligned')
    app.saveEntryFromMenu('bbb-unaligned')
    app.saveEntryFromMenu('ccc-unaligned')
    compareDownloadWithFixture('aaa-unaligned', 'files/aaa-unaligned')
    compareDownloadWithFixture('bbb-unaligned', 'files/bbb-unaligned')
    compareDownloadWithFixture('ccc-unaligned', 'files/ccc-unaligned')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')

    app.importPsuFromFixturesWithoutOverwrite('psu/baz-aligned.psu')
    app.entry('baz').click()
    app.entry('aaa-aligned').should('exist')
    app.entry('bbb-aligned').should('exist')
    app.entry('ccc-aligned').should('exist')
    clearDownloads()
    app.saveEntryFromMenu('aaa-aligned')
    app.saveEntryFromMenu('bbb-aligned')
    app.saveEntryFromMenu('ccc-aligned')
    compareDownloadWithFixture('aaa-aligned', 'files/aaa-aligned')
    compareDownloadWithFixture('bbb-aligned', 'files/bbb-aligned')
    compareDownloadWithFixture('ccc-aligned', 'files/ccc-aligned')

    cy.dataCy('entry-up').click()
    app.entry('foo').should('exist')
    app.entry('bar').should('exist')
    app.entry('baz').should('exist')
  })

  it('exports files to .psu', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')
    clearDownloads()

    app.exportEntryFromMenu('foo')
    compareDownloadWithFixture('foo.psu', 'psu/foo-empty.psu')

    app.exportEntryFromMenu('bar')
    compareDownloadWithFixture('bar.psu', 'psu/bar-unaligned.psu')

    app.exportEntryFromMenu('baz')
    compareDownloadWithFixture('baz.psu', 'psu/baz-aligned.psu')
  })

  it('imports and saves files', () => {
    const checkFiles = () => {
      app.entry('aaa-empty').should('exist')
      app.entry('bbb-unaligned').should('exist')
      app.entry('ccc-aligned').should('exist')

      clearDownloads()
      app.saveEntryFromMenu('aaa-empty')
      app.saveEntryFromMenu('bbb-unaligned')
      app.saveEntryFromMenu('ccc-aligned')
      compareDownloadWithFixture('aaa-empty', 'files/aaa-empty')
      compareDownloadWithFixture('bbb-unaligned', 'files/bbb-unaligned')
      compareDownloadWithFixture('ccc-aligned', 'files/ccc-aligned')
    }

    app.newCard()
    app.openImportFilesDialog()
    app.addFileToImportFromFixtures('files/aaa-empty')
    app.addFileToImportFromFixtures('files/bbb-unaligned')
    app.addFileToImportFromFixtures('files/ccc-aligned')
    app.importFiles()
    checkFiles()
    app.closeCard()
    app.expectUnsavedChanges()

    app.newCard()
    app.addFileToImportFromFixturesWithDragNDrop('files/aaa-empty')
    app.addFileToImportFromFixturesWithDragNDrop('files/bbb-unaligned')
    app.addFileToImportFromFixturesWithDragNDrop('files/ccc-aligned')
    app.importFiles()
    checkFiles()
  })

  it('selects and deselects items', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    app.entrySelect('foo')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeNotSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.entrySelect('bar')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.entrySelect('baz')
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')

    app.toggleSelection()
    app.expectEntryToBeNotSelected('foo')
    app.expectEntryToBeNotSelected('bar')
    app.expectEntryToBeNotSelected('baz')

    app.toggleSelection()
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')

    app.entrySelect('foo')
    app.expectEntryToBeNotSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')
    app.toggleSelection()
    app.expectEntryToBeSelected('foo')
    app.expectEntryToBeSelected('bar')
    app.expectEntryToBeSelected('baz')
  })

  it('creates and opens new directory', () => {
    app.newCard()

    const name1 = 'foo'
    const name2 = 'bar'

    app.mkdir(name1)

    // should not allow creating directory with existing name
    cy.dataCy('toolbar-mkdir').click()
    cy.withinDialog(() => {
      cy.focused().type(name1)
      cy.get('button[disabled]').contains('Create')
      cy.get('button').contains('Cancel').click()
    })

    // open the new directory
    app.entry(name1).click()
    cy.contains('No items')
    cy.get('[data-cy="toolbar-mkdir"][disabled]').should('exist')
    cy.dataCy('entry-up').click() // go back
    app.entry(name1).should('exist')

    // submit with enter
    cy.dataCy('toolbar-mkdir').click()
    cy.withinDialog(() => {
      cy.contains('New directory name:')
      cy.focused().type(name2).type('{enter}')
    })
    app.entry(name2).should('exist')

    // close card, should prompt for unsaved changes
    app.closeCard()
    app.expectUnsavedChanges()
    cy.contains('No card loaded').should('exist')
  })

  it('deletes files and directories', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    app.entry('foo').click()

    // should deselect when opening menu on unselected item
    app.entrySelect('aaa-empty')
    app.deleteEntryFromMenu('ccc-empty')
    app.entryByName('aaa-empty').should('exist')
    app.entryByName('ccc-empty').should('not.exist')

    // should remove all selected items
    app.entrySelect('aaa-empty')
    app.entrySelect('bbb-empty')
    app.deleteEntryFromMenu('bbb-empty')
    cy.contains('No items')

    cy.dataCy('entry-up').click()

    // should deselect when opening menu on unselected item
    app.entrySelect('bar')
    app.entrySelect('baz')
    app.deleteEntryFromMenu('foo')
    app.entryByName('foo').should('not.exist')
    app.entryByName('bar').should('exist')
    app.entryByName('baz').should('exist')
  })

  it('renames directory', () => {
    app.newCard()

    app.mkdir('foo')
    app.renameEntryFromMenu('foo', 'bar')
    app.expectEntryMenuToBeClosed()

    app.entryMenu('bar')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'bar')
      cy.get('button').contains('Cancel').click()
    })
    app.expectEntryMenuToBeClosed()

    // open menu on one item, reposition it on the other, rename the other item
    app.mkdir('foo')

    app.entryMenu('foo')
    app.renameEntryFromMenu('bar', 'baz')

    app.entryMenu('baz')
    cy.dataCy('entry-menu-rename').click()
    cy.withinDialog(() => {
      cy.focused().should('have.value', 'baz')
      cy.get('button').contains('Cancel').click()
    })
    app.expectEntryMenuToBeClosed()
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

    // should close when going up
    app.entry(name1).click()
    app.entryMenu('aaa-empty')
    cy.dataCy('entry-up').click()
    app.expectEntryMenuToBeClosed()
  })

  it('navigates correctly', () => {
    app.openCardFromFixtures('cards/foo-bar-baz.mcd')

    // entry up
    app.entry('foo').click()
    app.entryByName('aaa-empty').should('exist')
    cy.dataCy('entry-up').click() // go back
    app.entryByName('foo').should('exist')

    // breadcrumbs root
    app.entry('bar').click()
    app.entryByName('aaa-unaligned').should('exist')
    cy.dataCy('breadcrumbs-root').click()
    app.entryByName('bar').should('exist')

    // going back
    app.entry('baz').click()
    app.entryByName('aaa-aligned').should('exist')
    cy.go('back')
    app.entryByName('baz').should('exist')

    // router
    cy.visit('#/foo')
    app.entryByName('aaa-empty').should('exist')
    cy.visit('#/')
    app.entryByName('foo').should('exist')
  })
})

const clearDownloads = () => cy.task('rmdir', Cypress.config('downloadsFolder'))

const compareDownloadWithFixture = (dlPath: string, fixturePath: string) => {
  cy
    .readFile(`${Cypress.config('downloadsFolder')}/${dlPath}`, null)
    .then((download: Uint8Array) => cy
      .fixture(fixturePath, null)
      .then((fixture: Uint8Array) => {
        const sizeMatches = download.length === fixture.length
        assert(sizeMatches, 'files size does not match')

        // naively comparing bytes in a for loop is unusably slow with big files
        const filesMatch = indexedDB.cmp(download, fixture) === 0
        assert(filesMatch, 'files do not match')
      })
    )
}

// Workaround for Cypress AE + TS + Vite
// See: https://github.com/quasarframework/quasar-testing/issues/262#issuecomment-1154127497
export {}

