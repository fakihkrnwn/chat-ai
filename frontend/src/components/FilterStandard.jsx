import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faPaperclip, faTimes, faDownload } from "@fortawesome/free-solid-svg-icons";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function FilterStandard({ 
  articles,
  onSelectArticle,
  selectedArticle,
  initialMessages = [],
  onSaveMessages = () => {},
  hasUserInputFilter = false,
  setHasUserInputFilter = () => {},
  showSaveButtonFilter = false,
  setShowSaveButtonFilter = () => {}
}) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [conversationState, setConversationState] = useState('initial');
  const [showYesNo, setShowYesNo] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageIdCounter = useRef(0);
  const createMessageId = useCallback(() => {
    messageIdCounter.current += 1;
    return messageIdCounter.current;
  }, []);

  useEffect(() => {
    onSaveMessages(messages);
  }, [messages, onSaveMessages]);

  useEffect(() => {
    setConversationState('awaiting_initial_response');
  }, []);

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

  const handleSubmit = async (e, yesNoResponse) => {
    e?.preventDefault();

    if (!inputValue.trim() && !selectedFile && !yesNoResponse) return;
    if (fileError) return;

    try {
      setIsLoading(true);

      if (!hasUserInputFilter && !yesNoResponse) {
        setHasUserInputFilter(true);
      }

      // Handle Yes/No response
      if (yesNoResponse) {
        const userMessage = {
          id: createMessageId(),
          type: 'user',
          text: yesNoResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        let aiText;
        let nextState;
        let showButtons = false;

        switch (conversationState) {
          case 'awaiting_standard_response':
            aiText = yesNoResponse === 'Yes' 
              ? "Is the standard clear?" 
              : "Please create one standard";
            nextState = yesNoResponse === 'Yes' 
              ? 'awaiting_stdclear_response' 
              : 'standard_creation';
            showButtons = yesNoResponse === 'Yes';
            if (yesNoResponse === 'No') setShowSaveButtonFilter(true);
            break;
            
          case 'awaiting_stdclear_response':
            aiText = yesNoResponse === 'Yes' 
              ? "Is the standard respected?" 
              : "Please clarify it.";
            nextState = yesNoResponse === 'Yes' 
              ? 'awaiting_respect_response' 
              : 'clarification_needed';
            showButtons = yesNoResponse === 'Yes';
            if (yesNoResponse === 'No') setShowSaveButtonFilter(true);
            break;
          
          case 'awaiting_respect_response':
            aiText = yesNoResponse === 'Yes' 
              ? "Does the standard include the problem encountered?" 
              : "Please train the people.";
            nextState = yesNoResponse === 'Yes' 
              ? 'awaiting_problem_response' 
              : 'train_people';
            showButtons = yesNoResponse === 'Yes';
            if (yesNoResponse === 'No') setShowSaveButtonFilter(true);
            break;
          
            case 'awaiting_problem_response':
              if (yesNoResponse === 'Yes') {
                aiText = "Thank you!";
                nextState = 'completed';
                setShowSaveButtonFilter(true);
              } else {
                aiText = "Please improve it.";
                nextState = 'improvement_needed';
              }
              showButtons = false;
              if (yesNoResponse === 'No') setShowSaveButtonFilter(true);
              break;
            
          default:
            aiText = "Unexpected response";
            nextState = 'error';
            showButtons = false;
        }
            

        const aiMessage = {
          id: createMessageId(),
          type: 'ai',
          text: aiText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage, aiMessage]);
        setConversationState(nextState);
        setShowYesNo(showButtons);
        setInputValue("");
        handleRemoveFile();
        return;
      }

      let fileContent = "";
      if (selectedFile) {
        if (selectedFile.type.startsWith('image/')) {
          fileContent = "[Image uploaded]";
        } else {
          const reader = new FileReader();
          fileContent = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsText(selectedFile);
          });
        }
      }

      const userMessage = {
        id: createMessageId(),
        type: 'user',
        text: inputValue,
        file: selectedFile,
        preview: filePreview,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      if (conversationState === 'awaiting_initial_response') {
        const matchedArticle = articles.find(article =>
          article.title.toLowerCase() === inputValue.toLowerCase()
        );
        
        if (matchedArticle) {
          const articleMessage = {
            id: createMessageId(),
            type: 'ai',
            text: matchedArticle.content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            link: matchedArticle.link
          };

          const followUpMessage = {
            id: createMessageId(),
            type: 'ai',
            text: "Is there any standard?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setMessages(prev => [...prev, userMessage, articleMessage, followUpMessage]);
          setInputValue("");
          handleRemoveFile();
          setConversationState('awaiting_standard_response');
          setShowYesNo(true);
          return; 
        }
      }

      setMessages(prev => [...prev, userMessage]);
      setInputValue("");
      handleRemoveFile();

      if (conversationState === 'awaiting_initial_response') {
        const followUpMessage = {
          id: createMessageId(),
          type: 'ai',
          text: "Is there any standard?",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, followUpMessage]);
        setConversationState('awaiting_standard_response');
        setShowYesNo(true);
      } else {
        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (error) {
      setMessages(prev => [...prev, {
        id: createMessageId(),
        type: 'system',
        text: `Error: ${error.message}`,
        time: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!messagesContainerRef.current) {
        console.error("Element not found");
        return;
      }
      
      const originalOverflow = messagesContainerRef.current.style.overflow;
      messagesContainerRef.current.style.overflow = 'visible';
      
      // Capture elemen
      const canvas = await html2canvas(messagesContainerRef.current, {
        scale: 2,
        scrollY: 0,
        windowWidth: messagesContainerRef.current.scrollWidth,
        windowHeight: messagesContainerRef.current.scrollHeight,
        useCORS: true
      });
      
      messagesContainerRef.current.style.overflow = originalOverflow;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.setFont('Inter', 'bold');
      pdf.setFontSize(20);
      pdf.setTextColor('#000000');
      pdf.text("Filter of Standard", 
              pdf.internal.pageSize.getWidth() / 2, 
              20,
              { align: 'center' });
      
      const imgWidth = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 30, imgWidth, imgHeight);
      
      pdf.save('standard_conversation.pdf');
      
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setShowSaveButton(false);
    }
  };
  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <h2>Filter of Standard</h2>
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
                    Learn More
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

      {showSaveButtonFilter && (
        <div className="save-container">
          <button 
            type="button" 
            className="save-button"
            onClick={handleSave}
          >
            <FontAwesomeIcon icon={faDownload} /> Save as PDF
          </button>
        </div>
      )}

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

        {!hasUserInputFilter && (
          <input
            type="file"
            id="file-upload"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        )}
        
        {/* Button Upload */}
        {!hasUserInputFilter && (
          <label 
            htmlFor="file-upload" 
            className={`file-upload-button ${fileError ? 'error' : ''}`}
            title="Upload file"
          >
            <FontAwesomeIcon icon={faPaperclip} />
          </label>
        )}


        {showYesNo ? (
          <div className="yes-no-buttons">
            <button 
              type="button" 
              className="yes-button"
              onClick={() => handleSubmit(null, 'Yes')}
              disabled={isLoading}
            >
              Yes
            </button>
            <button 
              type="button"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
              className="no-button"
              onClick={() => handleSubmit(null, 'No')}
              disabled={isLoading}
            >
              No
            </button>
          </div>
        ) : !hasUserInputFilter && (
          <>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
            {/* Input text */}
            <input
              type="text"
              placeholder="Problem description..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading || showYesNo}
            />
            {/* Button Submit */}
            <button type="submit" disabled={isLoading || showYesNo}>
              {isLoading ? 
                <div className="loading-spinner"></div> :
                <FontAwesomeIcon icon={faPaperPlane} />
              }
            </button>

            
          </>
        )}

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