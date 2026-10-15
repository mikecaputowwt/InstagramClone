import firebase from 'firebase';
import React, { useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { container, form } from '../styles';

export default function Login(props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState({ visible: false, message: '' });

    const onSignUp = () => {
        // Validate inputs
        if (email.length === 0 || password.length === 0) {
            setError({ visible: true, message: "Please fill out all fields" });
            return;
        }

        firebase.auth().signInWithEmailAndPassword(email, password)
            .catch((err) => {
                let message = "Something went wrong";
                
                // Handle common Firebase authentication errors
                if (err.code === 'auth/user-not-found') {
                    message = "User not found. Please check your email or register.";
                } else if (err.code === 'auth/wrong-password') {
                    message = "Incorrect password. Please try again.";
                } else if (err.code === 'auth/invalid-email') {
                    message = "Invalid email format.";
                } else if (err.code === 'auth/user-disabled') {
                    message = "This account has been disabled.";
                } else if (err.code === 'auth/too-many-requests') {
                    message = "Too many failed login attempts. Please try again later.";
                } else if (err.code === 'auth/network-request-failed') {
                    message = "Network error. Please check your connection.";
                }
                
                setError({ visible: true, message });
            })
    }

    return (
        <View style={container.center}>
            <View style={container.formCenter}>
                <TextInput
                    style={form.textInput}
                    placeholder="email"
                    onChangeText={(email) => setEmail(email)}
                />
                <TextInput
                    style={form.textInput}
                    placeholder="password"
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                />

                <Button
                    style={form.button}
                    onPress={() => onSignUp()}
                    title="Sign In"
                />
            </View>


            <View style={form.bottomButton} >
                <Text
                    title="Register"
                    onPress={() => props.navigation.navigate("Register")} >
                    Don't have an account? SignUp.
                </Text>
            </View>
            
            <Snackbar
                visible={error.visible}
                duration={3000}
                onDismiss={() => setError({ visible: false, message: '' })}>
                {error.message}
            </Snackbar>
        </View>
    )
}
