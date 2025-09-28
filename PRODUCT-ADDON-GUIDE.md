# Product Add-on Block Usage Guide

## How to Use the Product Add-on Block

### 1. Add the Block to Your Product Template

In the Shopify theme customizer:

1. Go to **Online Store > Themes > Customize**
2. Navigate to a **Product page**
3. In the **Product information** section, click **Add block**
4. Select **Product Add-on** from the list
5. Configure the settings:
   - **Show title**: Enable/disable the section title
   - **Title**: Set the title (default: "Add-ons")
   - **Add-on product**: Select the product you want as an add-on

### 2. How It Works

- The block displays a checkbox with the selected add-on product
- Shows product image, title, current price, and compare price (if available)
- When the checkbox is checked and user clicks "Add to Cart", both the main product and the add-on will be added to the cart
- Uses the existing theme's cart system for seamless integration

### 3. Styling

The block includes comprehensive CSS that:
- Matches your theme's design system
- Is fully responsive (mobile-friendly)
- Uses theme color variables
- Includes hover states and checked states
- Shows a checkmark when selected

### 4. JavaScript Integration

The JavaScript automatically:
- Listens for add to cart form submissions
- Detects checked add-on products
- Adds them to cart after the main product
- Integrates with existing cart drawer/page updates
- Shows error messages if something goes wrong

### 5. Customization Options

You can customize:
- The section title
- Which product to use as an add-on
- Padding around the block
- All styling via CSS variables

### 6. Technical Notes

- Works with both AJAX and form submission add to cart methods
- Integrates with existing ProductFormComponent
- Handles cart updates and notifications
- Gracefully handles errors
- Mobile responsive design

## Files Created:

1. `/blocks/product-addon.liquid` - The main block template
2. `/assets/product-addon.js` - JavaScript functionality
3. Updated `/blocks/_product-details.liquid` schema to allow the new block type

## Next Steps:

1. Test the block in the theme customizer
2. Add it to your product template
3. Select an add-on product
4. Test the add to cart functionality
5. Customize styling if needed
