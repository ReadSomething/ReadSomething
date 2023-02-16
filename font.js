const fs = require('fs')
const path = require('path')
const fontPath = path.resolve(__dirname, 'assets/fonts')
const fontFamily = path.resolve(__dirname, './fontFamily.css')
const fontClassNames = path.resolve(__dirname, './fontClassNames.css')
const fontDirs = fs.readdirSync(fontPath)

console.log(fontPath)
console.log(fontFamily)

function generateFontFamily() {
    let fontText = ''

    function getFontWight(name) {
        name = name.toLowerCase().replaceAll(' ', '')

        if (name.includes('semibold')) return 600
        if (name.includes('extrabold')) return 800
        if (name.includes('bold')) return 700
        if (name.includes('medium')) return 500
        if (name.includes('normal')) return 400
        if (name.includes('extralight')) return 200
        if (name.includes('light')) return 300
        if (name.includes('thin')) return 100
        if (name.includes('heavy')) return 900

        return 'normal'
    }

    function getFontStyle(name) {
        name = name.toLowerCase().replaceAll(' ', '')

        if (name.includes('italic')) return 'italic'

        return 'normal'
    }


    function newFontTemplate(familyItem, fontsItem, format) {
        const dataUrl = 'data-base64:~assets/fonts/' + familyItem + '/' + fontsItem

        return `@font-face {
                font-family: '${familyItem}';
                src: url('${dataUrl}') ${format};
                font-weight: ${getFontWight(fontsItem)};
                font-style: ${getFontStyle(fontsItem)};
            }`
    }

    fontDirs.map(familyItem => {
        const dir = fontPath + '/' + familyItem
        const fontsFiles = fs.readdirSync(dir)

        fontsFiles.map(fontsItem => {
            if (fontsItem.endsWith('ttf')) {
                fontText += newFontTemplate(familyItem, fontsItem, "format('truetype')")
            }

            if (fontsItem.endsWith('otf')) {
                fontText += newFontTemplate(familyItem, fontsItem, "format('opentype')")
            }
        })
    })

    fs.writeFileSync(fontFamily, fontText)
}

function generateFontClassNames() {
    let fontStr = ''

    fontDirs.map(item => {
        fontStr += `&.${item}{font-family: ${item}!important}\n`
    })

    fs.writeFileSync(fontClassNames, `.ReadSomething {
        ${fontStr}
    }`)
}

void function main() {
    generateFontFamily()
    // generateFontClassNames()
}()
