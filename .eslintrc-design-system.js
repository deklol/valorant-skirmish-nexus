// ESLint rules to enforce design system usage
// Add these to your .eslintrc.js

module.exports = {
  rules: {
    // Prevent direct HTML elements that have Standard equivalents
    "no-restricted-syntax": [
      "error",
      {
        "selector": "JSXElement[openingElement.name.name='input']:not([openingElement.attributes.0.name.name='type'][openingElement.attributes.0.value.value='hidden'])",
        "message": "Use StandardInput instead of raw <input>. Import from @/components/ui"
      },
      {
        "selector": "JSXElement[openingElement.name.name='textarea']",
        "message": "Use StandardTextarea instead of raw <textarea>. Import from @/components/ui"
      },
      {
        "selector": "JSXElement[openingElement.name.name='select']",
        "message": "Use StandardSelect instead of raw <select>. Import from @/components/ui"
      },
      {
        "selector": "JSXElement[openingElement.name.name='h1'], JSXElement[openingElement.name.name='h2'], JSXElement[openingElement.name.name='h3'], JSXElement[openingElement.name.name='h4'], JSXElement[openingElement.name.name='h5'], JSXElement[openingElement.name.name='h6']",
        "message": "Use StandardHeading instead of raw heading tags. Import from @/components/ui"
      }
    ],
    
    // Prevent importing deprecated components
    "no-restricted-imports": [
      "error",
      {
        "paths": [
          {
            "name": "@/components/ui/input",
            "message": "Use StandardInput from @/components/ui instead"
          },
          {
            "name": "@/components/ui/textarea", 
            "message": "Use StandardTextarea from @/components/ui instead"
          },
          {
            "name": "@/components/ui/tabs",
            "message": "Use StandardTabs from @/components/ui instead"
          }
        ]
      }
    ]
  }
}