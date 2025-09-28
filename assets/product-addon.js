/**
 * Product Add-on functionality
 * Integrates with existing ProductFormComponent to add selected add-on products to cart
 */

class ProductAddon {
  constructor() {
    this.pendingAddons = null;
    this.isProcessingAddons = false; // Flag to prevent loops
    this.processedEventIds = new Set(); // Track processed events
    this.lastCartCountUpdate = 0; // Rate limiting for cart count updates
    this.init();
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    // Listen for the theme's CartAddEvent (which uses 'cart:update' event name)
    document.addEventListener('cart:update', (event) => {
      // Only handle if this is specifically an ADD event from a product form
      if (this.isAddToCartEvent(event)) {
        this.handleCartAdd(event);
      }
    });

    // Listen for form submissions to mark when we're expecting an add-to-cart
    document.addEventListener('submit', (event) => {
      if (event.target && event.target.matches && event.target.matches('form[action*="/cart/add"]')) {
        this.handleFormSubmit(event);
      }
    });
  }

  isAddToCartEvent(event) {
    // Check if this is an ADD event (not update, remove, etc.)
    if (!event.detail || !event.detail.data) {
      return false;
    }

    const data = event.detail.data;
    
    // Must be from product-form-component source (not quantity updates, removes, etc.)
    if (data.source !== 'product-form-component') {
      console.log('Not a product form add event, source:', data.source);
      return false;
    }

    // Must not be an error
    if (data.didError) {
      console.log('Add to cart had errors, skipping');
      return false;
    }

    // Must have a product ID (indicating a product was added)
    if (!data.productId) {
      console.log('No product ID in event, not a product add');
      return false;
    }

    console.log('Valid add to cart event detected');
    return true;
  }

  handleFormSubmit(event) {
    const form = event.target;
    const checkedAddons = this.getCheckedAddons();
    
    if (checkedAddons.length === 0) {
      return; // No add-ons selected, proceed with normal form submission
    }

    // Store add-ons to be added after main product
    this.pendingAddons = checkedAddons;
  }

  async handleCartAdd(event) {
    console.log('Processing add to cart event for addon addition:', event);
    
    // Prevent loops - ignore events we generated ourselves
    if (event.detail && event.detail.data && event.detail.data.source === 'product-addon') {
      console.log('Ignoring our own cart update event');
      return;
    }
    
    // Prevent multiple simultaneous processes
    if (this.isProcessingAddons) {
      console.log('Already processing addons, skipping');
      return;
    }
    
    // Create a unique event ID to prevent processing the same event twice
    if (event.detail) {
      if (event.detail.eventId && this.processedEventIds.has(event.detail.eventId)) {
        console.log('Event already processed, skipping');
        return;
      }
      if (event.detail.eventId) {
        this.processedEventIds.add(event.detail.eventId);
      }
    }
    
    // Check if we have pending add-ons or check for currently selected add-ons
    let addonsToAdd = this.pendingAddons || this.getCheckedAddons();
    
    if (addonsToAdd.length === 0) {
      console.log('No addons selected, skipping');
      return; // No add-ons selected
    }

    // Set processing flag to prevent loops
    this.isProcessingAddons = true;

    try {
      console.log('Adding addon products:', addonsToAdd);
      
      // Add a small delay to ensure the main product was added successfully
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const addonItems = addonsToAdd.map(addon => ({
        id: addon.variantId,
        quantity: 1
      }));
      
      await this.addToCart(addonItems);
      
      // Clear pending addons
      this.pendingAddons = null;
      
      // Clear processed events older than 5 seconds to prevent memory leaks
      setTimeout(() => {
        this.processedEventIds.clear();
      }, 5000);
      
      // Trigger proper cart refresh with section updates
      await this.triggerCartRefresh();
      
      console.log('Successfully added addon products to cart');
      
    } catch (error) {
      console.error('Error adding addon products to cart:', error);
      this.showErrorMessage('Failed to add some add-on products to cart.');
    } finally {
      // Always reset the processing flag
      this.isProcessingAddons = false;
    }
  }

  getCheckedAddons() {
    const checkboxes = document.querySelectorAll('[data-addon-checkbox]:checked');
    const addons = Array.from(checkboxes).map(checkbox => {
      const addonContainer = checkbox.closest('.product-addon');
      if (addonContainer && addonContainer.dataset) {
        return {
          productId: addonContainer.dataset.addonProductId,
          variantId: addonContainer.dataset.addonVariantId,
          price: addonContainer.dataset.addonPrice
        };
      }
      return null;
    }).filter(addon => addon !== null);
    
    console.log('Found checked addons:', addons);
    return addons;
  }

  async addToCart(items) {
    console.log('Adding items to cart:', items);
    
    const response = await fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        items: items
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to add items to cart');
    }

    return response.json();
  }

  async triggerCartRefresh() {
    console.log('Triggering cart refresh...');
    
    try {
      // Simple approach: just trigger the cart update event without fetching sections
      // The cart components will handle their own section updates
      const cartUpdateEvent = new CustomEvent('cart:update', { 
        bubbles: true,
        detail: {
          source: 'product-addon',
          data: {
            source: 'product-addon'
          }
        }
      });
      
      // Dispatch the event
      document.dispatchEvent(cartUpdateEvent);
      
      // Update cart count
      await this.updateCartCount();
      
      console.log('Cart refresh completed');
      
    } catch (error) {
      console.error('Error during cart refresh:', error);
      // Fallback to simple events if anything fails
      this.triggerSimpleCartUpdate();
    }
  }

  triggerSimpleCartUpdate() {
    console.log('Triggering simple cart updates...');
    
    // Trigger basic cart update events
    document.dispatchEvent(new CustomEvent('cart:update', { 
      bubbles: true,
      detail: {
        source: 'product-addon',
        data: {
          source: 'product-addon'
        }
      }
    }));
    
    // Also trigger other common cart events
    document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
    document.dispatchEvent(new CustomEvent('cart-drawer:refresh', { bubbles: true }));
  }

  async updateCartCount() {
    // Rate limiting: only update cart count once per second
    const now = Date.now();
    if (now - this.lastCartCountUpdate < 1000) {
      console.log('Cart count update rate limited, skipping');
      return;
    }
    
    this.lastCartCountUpdate = now;
    
    try {
      // Fetch current cart to get updated count
      const response = await fetch('/cart.js');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const cart = await response.json();
      
      // Update cart count in header
      const cartCountElements = document.querySelectorAll('[data-cart-count], .cart-count');
      cartCountElements.forEach(element => {
        element.textContent = cart.item_count.toString();
      });
      
      // Dispatch a custom event with cart data for other components to listen to
      document.dispatchEvent(new CustomEvent('cart:count-updated', { 
        bubbles: true,
        detail: { 
          count: cart.item_count,
          cart: cart
        }
      }));
      
      console.log('Cart count updated:', cart.item_count);
      
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  }

  showErrorMessage(message = 'Error adding products to cart. Please try again.') {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = 'product-addon-notification product-addon-notification--error';
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-size: 14px;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ProductAddon();
  });
} else {
  new ProductAddon();
}

// Export for potential external use
window.ProductAddon = ProductAddon;
