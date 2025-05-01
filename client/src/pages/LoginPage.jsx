// src/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// inline theme: identical in both files
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

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axios.post('/api/login', { username, password });
      onLogin({ id: data.userId, username: data.username });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err.response?.data || err.message);
      setError('Login failed. Please check your credentials.');
    }
  };

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
        <Card elevation={6} sx={{ maxWidth: 360, width: '100%', borderRadius: 2 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <LockOutlinedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h5" component="h1" gutterBottom>
              Sign In
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                Login
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 2 }}>
              Don’t have an account?{' '}
              <Link component={RouterLink} to="/signup" underline="hover">
                Sign up
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}
