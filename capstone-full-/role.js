function showComingSoonMessage() {
    const toast = document.getElementById('toast');
    
    // Show the toast with animation
    toast.classList.add('show');
    
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  };