/**
 * Links Module - Handles deep link generation for various apps
 */
const Links = (function() {

  /**
   * Link type definitions with icons and labels
   */
  const linkTypes = {
    none: { icon: '❌', label: 'None' },
    whatsapp: { icon: '💬', label: 'WhatsApp' },
    calendar: { icon: '📅', label: 'Calendar' }
  };

  /**
   * Generate WhatsApp link
   * @param {Object} data - { phone: string, message?: string }
   */
  function generateWhatsAppLink(data) {
    if (!data.phone) return null;

    // Clean phone number (remove spaces, dashes, keep + and digits)
    const phone = data.phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
    let url = `https://wa.me/${phone}`;

    if (data.message) {
      url += `?text=${encodeURIComponent(data.message)}`;
    }

    return url;
  }

  /**
   * Generate Google Calendar link - opens week view to see events
   */
  function generateCalendarLink() {
    // Opens Google Calendar in week view showing current week's events
    return 'https://calendar.google.com/calendar/r/week';
  }

  /**
   * Generate link based on type and data
   * @param {string} type - Link type
   * @param {Object} data - Link-specific data
   */
  function generateLink(type, data) {
    switch (type) {
      case 'whatsapp':
        return generateWhatsAppLink(data);
      case 'calendar':
        return generateCalendarLink();
      default:
        return null;
    }
  }

  /**
   * Open a link in appropriate way
   * @param {string} url - The URL to open
   */
  function openLink(url) {
    if (!url) return false;

    // For web links, open in new tab/window
    // For app scheme links, just navigate
    if (url.startsWith('http')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }

    return true;
  }

  /**
   * Get link type info
   * @param {string} type - Link type
   */
  function getLinkTypeInfo(type) {
    return linkTypes[type] || linkTypes.none;
  }

  /**
   * Get all link types
   */
  function getAllLinkTypes() {
    return linkTypes;
  }

  // Public API
  return {
    generateLink,
    openLink,
    getLinkTypeInfo,
    getAllLinkTypes
  };
})();
