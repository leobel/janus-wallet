import { useState } from 'react'
import { Card, TextField, Button, Typography, Box, Link, IconButton, InputAdornment, Alert, Stack } from '@mui/material'
import { useFormik } from 'formik'
import * as yup from 'yup'
import useAuth from '../hooks/useAuth'
import { useNavigate } from 'react-router'
import { login } from '../services/auth.service'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import VisibilityIcon from '@mui/icons-material/Visibility'


const validationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required'),
  password: yup
    .string()
    .required('Password is required'),
})

export default function SignIn() {
  const { setAuth } = useAuth()
  const [errMsg, setErrMsg] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [signing, setSigning] = useState(false)
  const navigate = useNavigate()


  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: validationSchema,
    onSubmit: async ({ username, password }) => {
      try {
        setErrMsg('')
        setSigning(true)
        const user = await login(username, password)
        if (user) {
          console.log('User:', user)
          setAuth({ user })
          navigate('/')
        } else {
          setErrMsg('Login failed, please try again')
        }
      } catch (err: any) {
        console.log('Login Error:', err)
        if (!err?.response) {
          setErrMsg('No Server Response')
        } else if (err.response?.status === 401) {
          setErrMsg('Invalid Credentials')
        } else {
          setErrMsg('Login Failed')
        }
        // errRef.current.focus()
      } finally {
        setSigning(false)
      }
    },
  })

  const handleClickShowPassword = () => setShowPassword((show) => !show)

  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  const handleMouseUpPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-300">
      <Card className="max-w-md mx-4" sx={{ p: 3 }}>
        <div className="text-center py-6">
          <Typography variant="h4" component="h1" className="font-bold">
            Sign in
          </Typography>
          <Typography variant="subtitle1" color="textSecondary" className="mt-2">
            Welcome to Janus, your programmable wallet
          </Typography>
        </div>

        <Box>
          <form onSubmit={formik.handleSubmit} noValidate>
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <TextField
                fullWidth
                id="username"
                name="username"
                label="Username"
                value={formik.values.username}
                onChange={formik.handleChange}
                error={formik.touched.username && Boolean(formik.errors.username)}
                helperText={formik.touched.username && formik.errors.username}
              />
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position='end'>
                      <IconButton
                        aria-label={
                          showPassword ? 'hide the password' : 'display the password'
                        }
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        onMouseUp={handleMouseUpPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  }
                }}
                value={formik.values.password}
                onChange={formik.handleChange}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
              />
              { errMsg && <Alert severity="error">{errMsg}</Alert>}
              <Button
                color="primary"
                variant="contained"
                fullWidth
                type="submit"
                loading={signing}
              >
                LOGIN
              </Button>
            </Stack>
          </form>
        </Box>
        <Box display="flex" justifyContent="center" sx={{ paddingTop: 5 }}>
          <Typography>Need an account?</Typography>
          <Link href="/signup" color="inherit" sx={{ paddingX: 1 }}>SIGN UP</Link>
        </Box>
      </Card>
    </div>
  )
} 