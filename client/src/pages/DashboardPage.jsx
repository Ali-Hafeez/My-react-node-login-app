// src/DashboardPage.jsx
import React from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Fade,
  Grow,
  CircularProgress
} from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0D47A1',
      light: '#5472d3',
      dark: '#002171',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6F00',
      light: '#FFA040',
      dark: '#C43E00',
      contrastText: '#212121',
    },
    background: {
      default: '#E3F2FD',
      paper: '#FFFFFF',
    },
    error: {
      main: '#D32F2F',
      contrastText: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: `'Roboto', 'Helvetica', 'Arial', sans-serif`,
  },
  shape: {
    borderRadius: 8,
  },
});

export default function DashboardPage({ user, onLogout }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Fade in timeout={800}>
          <Card elevation={6} sx={{ maxWidth: 400, width: '100%', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Grow in timeout={1200}>
                <Typography variant="h4" gutterBottom color="primary">
                  🚧 Under Development 🚧
                </Typography>
              </Grow>

              <Grow in timeout={1400}>
                <Typography variant="subtitle1" gutterBottom>
                  This dashboard is coming soon! Stay tuned.
                </Typography>
              </Grow>

              <Grow in timeout={1600}>
                <CircularProgress sx={{ mt: 2 }} />
              </Grow>

              {user && (
                <Grow in timeout={1800}>
                  <Typography variant="body2" sx={{ mt: 3 }}>
                    Logged in as: <strong>{user.username}</strong>
                  </Typography>
                </Grow>
              )}

              <Grow in timeout={2000}>
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{ mt: 4 }}
                  onClick={onLogout}
                >
                  Logout
                </Button>
              </Grow>
            </CardContent>
          </Card>
        </Fade>
      </Box>
    </ThemeProvider>
  );
}
