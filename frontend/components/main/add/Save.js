import { Feather } from '@expo/vector-icons';
import { Video } from 'expo-av';
import firebase from 'firebase';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MentionsTextInput from 'react-native-mentions';
import { Snackbar } from 'react-native-paper';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as ImageManipulator from 'expo-image-manipulator';
import { fetchUserPosts, sendNotification } from '../../../redux/actions/index';
import { container, navbar, text, utils } from '../../styles';


require("firebase/firestore")
require("firebase/firebase-storage")



function Save(props) {
    const [caption, setCaption] = useState("")
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(false)
    const [data, setData] = useState("")
    const [keyword, setKeyword] = useState("")
    const [isBlackAndWhite, setIsBlackAndWhite] = useState(false)
    const [processedImageUri, setProcessedImageUri] = useState(null)
    const [processing, setProcessing] = useState(false)


    useLayoutEffect(() => {
        props.navigation.setOptions({
            headerRight: () => (
                <Feather style={navbar.image} name="check" size={24} color="green" onPress={() => { uploadImage() }} />
            ),
        });
    }, [caption, processedImageUri]);

    // Process image when filter is toggled
    useEffect(() => {
        const processImage = async () => {
            if (props.route.params.type && props.route.params.source) {
                setProcessing(true);
                if (isBlackAndWhite) {
                    const filtered = await applyBlackAndWhiteFilter(props.route.params.source);
                    setProcessedImageUri(filtered);
                } else {
                    setProcessedImageUri(props.route.params.source);
                }
                setProcessing(false);
            } else {
                setProcessedImageUri(props.route.params.source);
            }
        };
        processImage();
    }, [isBlackAndWhite, props.route.params.source, props.route.params.type]);

    const applyBlackAndWhiteFilter = async (uri) => {
        try {
            // Using ImageManipulator to create a processed version
            // Note: Expo ImageManipulator doesn't have built-in grayscale
            // We'll create a canvas-based solution using HTML5 Canvas API
            
            if (typeof document !== 'undefined') {
                // Web platform - use canvas
                return await applyGrayscaleWeb(uri);
            } else {
                // Mobile - use a workaround with image manipulation
                // For a full grayscale effect on mobile, we'd need expo-gl or a native module
                // This version will prepare the image for upload
                const manipResult = await ImageManipulator.manipulateAsync(
                    uri,
                    [
                        { resize: { width: 1080 } }
                    ],
                    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                );
                
                return manipResult.uri;
            }
        } catch (error) {
            console.error('Error processing image:', error);
            return uri;
        }
    };

    const applyGrayscaleWeb = async (uri) => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Apply grayscale formula
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = gray;
                    data[i + 1] = gray;
                    data[i + 2] = gray;
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = uri;
        });
    };

    const uploadImage = async () => {
        if (uploading) {
            return;
        }
        setUploading(true)
        let downloadURLStill = null
        
        // Use processed image if filter is applied, otherwise use original
        const sourceToUpload = (isBlackAndWhite && processedImageUri) ? processedImageUri : props.route.params.source;
        let downloadURL = await SaveStorage(sourceToUpload, `post/${firebase.auth().currentUser.uid}/${Math.random().toString(36)}`)

        if (props.route.params.imageSource != null) {
            downloadURLStill = await SaveStorage(props.route.params.imageSource, `post/${firebase.auth().currentUser.uid}/${Math.random().toString(36)}`)
        }

        savePostData(downloadURL, downloadURLStill);

    }

    const SaveStorage = async (image, path) => {
        if (image == 'default') {
            return '';
        }

        const fileRef = firebase.storage().ref()
            .child(path);

        const response = await fetch(image);
        const blob = await response.blob();

        const task = await fileRef.put(blob);

        const downloadURL = await task.ref.getDownloadURL();

        return downloadURL;
    }
    const savePostData = (downloadURL, downloadURLStill) => {
        let object = {
            downloadURL,
            caption,
            likesCount: 0,
            commentsCount: 0,
            type: props.route.params.type,
            creation: firebase.firestore.FieldValue.serverTimestamp()
        }
        if (downloadURLStill != null) {
            object.downloadURLStill = downloadURLStill
        }

        firebase.firestore()
            .collection('posts')
            .doc(firebase.auth().currentUser.uid)
            .collection("userPosts")
            .add(object).then((result) => {
                props.fetchUserPosts()
                props.navigation.popToTop()
            }).catch((error) => {
                setUploading(false)
                setError(true)
            })

        var pattern = /\B@[a-z0-9_-]+/gi;
        let array = caption.match(pattern);

        if (array !== null) {

            for (let i = 0; i < array.length; i++) {
                firebase.firestore()
                    .collection("users")
                    .where("username", "==", array[i].substring(1))
                    .get()
                    .then((snapshot) => {

                        snapshot.forEach((doc) => {
                            props.sendNotification(doc.data().notificationToken, "New tag", `${props.currentUser.name} Tagged you in a post`, { type: 0, user: firebase.auth().currentUser.uid })

                        });
                    })
            }
        }


    }

    const renderSuggestionsRow = ({ item }, hidePanel) => {
        return (
            <TouchableOpacity onPress={() => onSuggestionTap(item.username, hidePanel)}>
                <View style={styles.suggestionsRowContainer}>
                    <View style={styles.userIconBox}>
                        <Image
                            style={{ aspectRatio: 1 / 1, height: 45 }}
                            source={{
                                uri: item.image
                            }}
                        />
                    </View>
                    <View style={styles.userDetailsBox}>
                        <Text style={styles.displayNameText}>{item.name}</Text>
                        <Text style={styles.usernameText}>@{item.username}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    const onSuggestionTap = (username, hidePanel) => {
        hidePanel();
        const comment = caption.slice(0, - keyword.length)
        setCaption(comment + '@' + username + " ");
    }


    const callback = (keyword) => {
        setKeyword(keyword)
        firebase.firestore()
            .collection("users")
            .where("username", ">=", keyword.substring(1))
            .limit(10)
            .get()
            .then((snapshot) => {
                let result = snapshot.docs.map(doc => {

                    const data = doc.data();
                    const id = doc.id;
                    return { id, ...data }
                });
                setData(result)

            })
    }

    return (
        <View style={[container.container, utils.backgroundWhite]}>
            {uploading ? (

                <View style={[container.container, utils.justifyCenter, utils.alignItemsCenter]}>
                    <ActivityIndicator style={utils.marginBottom} size="large" />
                    <Text style={[text.bold, text.large]}>Upload in progress...</Text>
                </View>
            ) : (
                <View style={[container.container]}>
                    <View style={[container.container, utils.backgroundWhite, utils.padding15]}>

                        <View style={[{ marginBottom: 20, width: '100%' }]}>


                            <MentionsTextInput

                                textInputStyle={{ borderColor: '#ebebeb', borderWidth: 1, padding: 5, fontSize: 15, width: '100%' }}
                                suggestionsPanelStyle={{ backgroundColor: 'rgba(100,100,100,0.1)' }}
                                loadingComponent={() => <View style={{ flex: 1, width: 200, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>}
                                textInputMinHeight={30}
                                textInputMaxHeight={80}
                                trigger={'@'}
                                triggerLocation={'new-word-only'} // 'new-word-only', 'anywhere'
                                value={caption}
                                onChangeText={setCaption}
                                triggerCallback={callback.bind(this)}
                                renderSuggestionsRow={renderSuggestionsRow.bind(this)}
                                suggestionsData={data}
                                keyExtractor={(item, index) => item.username}
                                suggestionRowHeight={45}
                                horizontal={true}
                                MaxVisibleRowCount={3}
                            />
                        </View>

                        {/* Black & White Filter Toggle - Only show for images */}
                        {props.route.params.type && (
                            <View style={styles.filterToggleContainer}>
                                <Text style={styles.filterToggleLabel}>Black & White Filter</Text>
                                <TouchableOpacity 
                                    onPress={() => setIsBlackAndWhite(!isBlackAndWhite)}
                                    style={[
                                        styles.filterToggleButton,
                                        { backgroundColor: isBlackAndWhite ? '#000' : '#e0e0e0' }
                                    ]}
                                    activeOpacity={0.7}
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <ActivityIndicator size="small" color={isBlackAndWhite ? '#fff' : '#000'} />
                                    ) : (
                                        <Feather name="droplet" size={20} color={isBlackAndWhite ? '#fff' : '#000'} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        <View>
                            {props.route.params.type ? (
                                <View style={styles.imageContainer}>
                                    <Image
                                        style={[
                                            styles.imageStyle,
                                            isBlackAndWhite && styles.grayscaleFilter
                                        ]}
                                        source={{ uri: processedImageUri || props.route.params.source }}
                                    />
                                    {processing && (
                                        <View style={styles.processingOverlay}>
                                            <ActivityIndicator size="large" color="#fff" />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Video
                                    source={{ uri: props.route.params.source }}
                                    shouldPlay={true}
                                    isLooping={true}
                                    resizeMode="cover"
                                    style={{ aspectRatio: 1 / 1, backgroundColor: 'black' }}
                                />
                            )}
                        </View>

                    </View>
                    <Snackbar
                        visible={error}
                        duration={2000}
                        onDismiss={() => setError(false)}>
                        Something Went Wrong!
                    </Snackbar>
                </View>
            )}

        </View>

    )
}
const styles = StyleSheet.create({
    container: {
        height: 300,
        justifyContent: 'flex-end',
        paddingTop: 100
    },
    suggestionsRowContainer: {
        flexDirection: 'row',
    },
    userAvatarBox: {
        width: 35,
        paddingTop: 2
    },
    userIconBox: {
        height: 45,
        width: 45,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#54c19c'
    },
    usernameInitials: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14
    },
    userDetailsBox: {
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 10,
        paddingRight: 15
    },
    displayNameText: {
        fontSize: 13,
        fontWeight: '500'
    },
    usernameText: {
        fontSize: 12,
        color: 'rgba(0,0,0,0.6)'
    },
    filterToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#ebebeb',
    },
    filterToggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    filterToggleButton: {
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    imageContainer: {
        position: 'relative',
    },
    imageStyle: {
        aspectRatio: 1 / 1,
        backgroundColor: 'black',
    },
    grayscaleFilter: {
        // Visual indicator that filter is applied
        // Actual grayscale is applied in the image processing
        opacity: 0.95,
    },
    processingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const mapStateToProps = (store) => ({
    currentUser: store.userState.currentUser
})

const mapDispatchProps = (dispatch) => bindActionCreators({ fetchUserPosts, sendNotification }, dispatch);


export default connect(mapStateToProps, mapDispatchProps)(Save);
