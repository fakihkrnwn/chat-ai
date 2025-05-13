import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faTimes } from '@fortawesome/free-solid-svg-icons';
import axios from "axios";

export default function ChatAI({ 
  selectedArticle,
  articles,
  initialMessages = [],
  onSaveMessages = () => {}
 }) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageIdCounter = useRef(0);
  const createMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return messageIdCounter.current;
  }, []);

  useEffect(() => {
    onSaveMessages(messages);
  }, [messages, onSaveMessages]);
  
  const API_URL = "http://localhost:8000/query/";

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError("File is too large! Maximum 5MB");
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    setFileError("");

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileError("");
  };

  const handlePreviewClick = (file, previewUrl) => {
    if (!file) return;
    
    if (previewUrl) {
      setSelectedImage(previewUrl);
    } else {
      // Untuk file non-gambar
      const blob = new Blob([file], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedFile) return;
    
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: createMessageId(),
        type: 'user',
        text: inputValue,
        file: selectedFile,
        preview: filePreview,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      setSelectedFile(null);
      setFilePreview(null);
      setFileError("");
      
      // Kirim ke API
    const cleanUrl = API_URL.trim();
    const res = await axios.post(cleanUrl, { question: inputValue });

    let answer = "No response received";
    
    if (typeof res.data === 'string') {
      answer = res.data;
    } else if (res.data && typeof res.data === 'object') {
      if (typeof res.data.response === 'string') {
        answer = res.data.response;
      } else if (res.data.response?.content) {
        answer = res.data.response.content;
      } else {
        answer = JSON.stringify(res.data, null, 2);
      }
    }

    const aiMessage = {
      id: createMessageId(),
      type: 'ai',
      text: answer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, aiMessage]);
    
  } catch (error) {
    console.error("Error fetching response:", error);
    let errorMessage = "Error fetching response. Please try again.";
    
    if (error.response) {
      errorMessage = `Server error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = "No response from server. Check your connection.";
    } else {
      errorMessage = `Error: ${error.message}`;
    }

    const systemMessage = {
      id: createMessageId(),
      type: 'system',
      text: errorMessage,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, systemMessage]);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="chat-container">
    <div className="chat-header">
      <div className="header-content">
        <h2>Chat AI</h2>
        <div className="status">Online</div>
      </div>
    </div>

    <div className="messages-container" ref={messagesContainerRef}>
      {messages.map(message => (
        <div 
          key={message.id} 
          className={`message ${message.type}`}
        >
          <div className="message-bubble">
            {message.type === 'ai' ? (
              <>
                {message.text}
                {message.link && (
                  <a 
                    href={message.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ marginLeft: "8px", color: "#007bff", textDecoration: "underline", animationDelay: `${message.id * 1.0}s` }}
                  >
                  </a>
                )}
              </>
            ) : (
              <>
                {message.text}
                {message.file && (
                  <div 
                    className="file-info"
                    onClick={() => handlePreviewClick(message.file, message.preview)}
                    style={{ cursor: 'pointer' }}
                  >
                    {message.preview ? (
                      <img 
                        src={message.preview} 
                        alt="Preview" 
                        className="image-preview"
                      />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPaperclip} /> 
                        {message.file.name} 
                        <span>({message.file.type})</span>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="message-time">{message.
          time}</div>
        </div>
      ))}
      {isLoading && (
        <div className="loading-indicator">
          ••• Loading model response...
        </div>
      )}
      <div ref={messagesEndRef} style={{ float: "left", clear: "both" }}/>
    </div>

    <form className="input-container" onSubmit={(e) => handleSubmit(e)}>
      {/* Preview before sent */}
      {selectedFile && (
        <div className="pre-send-preview">
          <div 
            onClick={() => handlePreviewClick(selectedFile, filePreview)}
            style={{ cursor: 'pointer' }}
          >
            {filePreview ? (
              <img 
                src={filePreview} 
                alt="Preview" 
                className="pre-send-image"
              />
            ) : (
              <div className="file-placeholder">
                <FontAwesomeIcon icon={faPaperclip} /> {selectedFile.name}
              </div>
            )}
          </div>

          <button 
            type="button" 
            className="remove-file-button"
            onClick={handleRemoveFile}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      )}

      {/* Hidden Input File */}
      <input
        type="file"
        id="file-upload"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      <label 
          htmlFor="file-upload" 
          className={`file-upload-button ${fileError ? 'error' : ''}`}
          title="Upload file"
        >
          <FontAwesomeIcon icon={faPaperclip} />
        </label>

        {/* Input text */}
        <input
          type="text"
          placeholder="Problem description..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
        />

        {/* Button Submit */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 
            <div className="loading-spinner"></div> :
            <FontAwesomeIcon icon={faPaperPlane} />
          }
        </button>

      {fileError && (
        <div className="file-error-message">
          {fileError}
        </div>
      )}

    {selectedImage && (
      <div className="image-modal" onClick={() => setSelectedImage(null)}>
        <span>×</span>
        <img src={selectedImage} alt="Full preview" />
      </div>
    )}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       </form>
  </div>
);
}