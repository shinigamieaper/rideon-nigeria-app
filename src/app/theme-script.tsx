export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getThemePreference() {
              if (typeof localStorage !== 'undefined' && localStorage.getItem('rideon-theme')) {
                return localStorage.getItem('rideon-theme');
              }
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            
            function setTheme(theme) {
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else {
                // system theme
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }
            }
            
            const theme = getThemePreference();
            setTheme(theme);
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
              if (!localStorage.getItem('rideon-theme') || localStorage.getItem('rideon-theme') === 'system') {
                setTheme('system');
              }
            });
          })();
        `,
      }}
    />
  );
}
