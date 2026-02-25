

import React, { useState, useRef, useEffect } from 'react';
import { VideoCameraIcon, XMarkIcon, StopIcon, CameraIcon, CheckCircleIcon, ArrowPathIcon } from '../components/icons';
import { api } from '../services/api';
import { VideoEntry } from '../types';

interface VideoCaptureModalProps {
    patientId: string;
    onClose: () => void;
    onSaveSuccess: () => void; // Simplified to just notify parent to reload
}

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading' | 'saved' | 'error';

const VideoCaptureModal: React.FC<VideoCaptureModalProps> = ({ patientId, onClose, onSaveSuccess }) => {
    const [recordingState, setRecordingState] = useState<RecordingState>('idle');
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // Form data
    const [title, setTitle] = useState('');
    
    const [description, setDescription] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (recordingState === 'idle') {
            requestCameraAccess();
        }

        // Cleanup function
        return () => {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [recordingState]);

    const requestCameraAccess = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setMediaStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Error accessing camera/mic:", err);
            setRecordingState('error');
        }
    };

    const startRecording = () => {
        if (!mediaStream) return;

        setRecordedChunks([]);
        const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm; codecs=vp8,opus' }); // WebM is widely supported for browser recording

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => [...prev, event.data]);
            }
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            setVideoBlob(blob);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setRecordingState('preview');
        };

        recorder.start();
        setMediaRecorder(recorder);
        setRecordingState('recording');
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            mediaStream?.getTracks().forEach(track => track.stop()); // Stop camera/mic access after recording
            setMediaStream(null);
        }
    };

    const retakeVideo = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setVideoBlob(null);
        setPreviewUrl(null);
        setRecordedChunks([]);
        setTitle('');
        setDescription('');
        setRecordingState('idle');
        requestCameraAccess(); // Request access again
    };

    const uploadVideo = async () => {
        if (!videoBlob || !title.trim()) {
            alert("Título e vídeo são obrigatórios.");
            return;
        }

        setRecordingState('uploading');
        try {
            const user = await api.getUser(); // Get current doctor's user info
            const { videoUrl, thumbnailUrl } = await api.uploadVideo(videoBlob, patientId);
            
            // Save video entry details to the database
            const newVideoEntry: Omit<VideoEntry, 'id'> = {
                patientId: patientId,
                doctorId: user.id!, 
                title: title,
                description: description,
                videoUrl: videoUrl,
                createdAt: new Date().toISOString(),
                thumbnailUrl: thumbnailUrl
            };

            await api.createVideoEntry(newVideoEntry); // New API method to save video metadata
            
            onSaveSuccess(); // Notify parent to reload data
            setRecordingState('saved');
        } catch (err) {
            console.error("Error uploading video:", err);
            setRecordingState('error');
        }
    };

    const handleClose = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-[100] flex flex-col items-center justify-center p-4 text-white animate-fade-in">
            <button onClick={handleClose} className="absolute top-6 right-6 p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                <XMarkIcon className="w-6 h-6 text-slate-300" />
            </button>

            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <VideoCameraIcon className="w-8 h-8 text-blue-400" />
                Gravar Vídeo do Paciente
            </h2>

            {recordingState === 'error' && (
                <div className="text-center p-8 bg-red-900/20 border border-red-900/50 rounded-xl max-w-sm">
                    <p className="text-red-400 mb-4">Erro ao acessar câmera. Verifique as permissões do navegador.</p>
                    <button onClick={requestCameraAccess} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg">Tentar Novamente</button>
                </div>
            )}

            {(recordingState === 'idle' || recordingState === 'recording') && mediaStream && (
                <div className="relative w-full max-w-lg aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover"></video>
                    {recordingState === 'recording' && (
                        <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                            GRAVANDO
                        </div>
                    )}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        {recordingState === 'idle' && (
                            <button onClick={startRecording} className="p-4 bg-red-600 rounded-full shadow-lg hover:bg-red-500 transition-colors">
                                <VideoCameraIcon className="w-8 h-8 text-white" />
                            </button>
                        )}
                        {recordingState === 'recording' && (
                            <button onClick={stopRecording} className="p-4 bg-red-600 rounded-full shadow-lg hover:bg-red-500 transition-colors">
                                <StopIcon className="w-8 h-8 text-white" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {recordingState === 'preview' && previewUrl && (
                <div className="w-full max-w-lg">
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
                        <video ref={previewVideoRef} src={previewUrl} controls autoPlay loop className="w-full h-full object-cover"></video>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Título do Vídeo</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Breve descrição do vídeo"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1">Observações (Opcional)</label>
                            <textarea 
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                placeholder="Detalhes adicionais sobre o paciente ou condições observadas"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={retakeVideo} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            <CameraIcon className="w-5 h-5" />
                            Refazer
                        </button>
                        <button onClick={uploadVideo} disabled={!title.trim()} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" />
                            Salvar Vídeo
                        </button>
                    </div>
                </div>
            )}

            {recordingState === 'uploading' && (
                 <div className="text-center w-full max-w-lg animate-fade-in">
                    <ArrowPathIcon className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-6" />
                    <p className="text-xl font-bold mb-2">Enviando Vídeo...</p>
                    <p className="text-slate-400">Isso pode levar alguns instantes.</p>
                </div>
            )}

            {recordingState === 'saved' && (
                 <div className="text-center w-full max-w-lg animate-fade-in">
                    <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-6" />
                    <p className="text-xl font-bold mb-2">Vídeo Salvo com Sucesso!</p>
                    <p className="text-slate-400">O vídeo foi adicionado ao prontuário do paciente.</p>
                    <button onClick={onClose} className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl">Fechar</button>
                </div>
            )}
        </div>
    );
};

export default VideoCaptureModal;
