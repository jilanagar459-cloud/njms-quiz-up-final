# Requirements Document

## 1. Application Overview

**Application Name:** NJMS Quiz Up

**Description:** A web-based live quiz platform developed by Nagpur Jila Maheshwari Sabha (NJMS) with real-time capabilities, supporting mobile OTP authentication. The application provides two interfaces: User Interface for participants to join live quizzes and view leaderboards, and Admin Interface for quiz management and control.

## 2. Users and Usage Scenarios

**Target Users:**
- Quiz participants (general users)
- Quiz administrators

**Core Usage Scenarios:**
- Users register with mobile OTP authentication and participate in live quizzes
- Users answer timer-based questions and compete for higher scores
- Users receive real-time broadcast messages from administrators during quiz sessions
- Users view pre-quiz countdown with visual effects and audio before quiz starts
- Users view top winners podium screen after quiz ends
- Users view full leaderboard with their own position highlighted after quiz ends
- Administrators control live quiz sessions and manage content
- Administrators view real-time list of participants currently joined in quiz session
- Administrators send broadcast messages to all users in real-time
- Administrators configure number of top winners to display on podium screen
- Administrators review quiz history and export leaderboard data

## 3. Page Structure and Functional Description

### Page Structure

```
NJMS Quiz Up
├── User Interface
│   ├── Login Page
│   ├── Registration Page
│   ├── OTP Verification Page
│   ├── Live Quiz Page
│   │   ├── Pre-quiz Countdown Screen
│   │   ├── Question Display Screen
│   │   └── Top Winners Podium Screen
│   └── Leaderboard Page
└── Admin Interface
    ├── Admin Login Page
    ├── Quiz Control Panel
    │   └── Participants Panel
    ├── Advertisement Management Panel
    ├── Broadcast Message Panel
    ├── Leaderboard Management Page
    ├── User List Management Page
    ├── Quiz History Page
    └── Winners Display Configuration Panel
```

### 3.1 User Interface

#### 3.1.1 Login Page
- Display NJMS logo and name
- User inputs Mobile Number
- Submit to request OTP
- Trigger OTP sending to mobile number via SMS
- Link to Registration Page for new users
- Mobile-responsive design

#### 3.1.2 Registration Page
- Display NJMS logo and name
- User inputs Name
- User inputs Surname
- User inputs Mobile Number
- User selects Tehsil from dropdown (Nagpur district tehsils)
- Submit registration information
- Trigger OTP sending to mobile number via SMS
- Mobile-responsive design

#### 3.1.3 OTP Verification Page
- Display NJMS logo and name
- Show mobile number to which OTP was sent
- User inputs OTP code in separate digit boxes
- Auto-advance to next digit box when a digit is entered
- Auto-submit when all OTP digits are entered
- Display countdown timer for OTP expiration
- Provide \"Resend OTP\" option
- Disable \"Resend OTP\" button during countdown period
- Show countdown timer for resend availability
- Verify OTP for authentication
- Upon successful verification, user gains access to quiz features
- Display error message for invalid OTP
- Display error message for expired OTP
- Display error message for network errors
- Mobile-responsive design

#### 3.1.4 Live Quiz Page

**Pre-quiz Countdown Screen (when quiz status is 'waiting'):**
- Display animated countdown timer
- Show visual effects during countdown
- Play background audio during countdown
- Countdown is synchronized and visible to all participants

**Question Display Screen (when quiz status is 'active'):**
- Display current quiz question
- Display countdown timer (15 seconds per question)
- User selects answer option
- Submit answer before timer expires
- Display feedback on answer correctness
- Show current score
- Display video content during quiz session
- Display broadcast message notification banner or toast when admin sends a message
- Show message type indicator (info, warning, etc.)

**Top Winners Podium Screen (when quiz status is 'ended'):**
- Display celebratory podium screen showing top winners
- Show configurable number of top winners (as set by admin)
- Display winner name, surname, tehsil, and score
- Show visual celebration effects
- Provide option to view full leaderboard

#### 3.1.5 Leaderboard Page
- Display ranked list of all users with scores
- Highlight user's own ranking and score
- Show user name, surname, tehsil, and score for each entry
- Real-time update of leaderboard during live quiz
- After quiz ends, display complete leaderboard with all participants

### 3.2 Admin Interface

#### 3.2.1 Admin Login Page
- Admin inputs credentials
- Authenticate admin access

#### 3.2.2 Quiz Control Panel
- Start live quiz session
- Stop live quiz session
- Move to next question
- Display current question being shown to users
- Control video playback during quiz
- Create new quiz question
- Edit existing quiz question
- For photo or video question types, provide option to upload media file from device
- For photo or video question types, provide option to enter media URL
- Uploaded media files are stored in Supabase Storage

**Participants Panel:**
- Display real-time list of participants currently joined in quiz session
- Show participant Name
- Show participant Surname
- Show participant Tehsil
- Show participant Phone Number
- Update list automatically as users join or leave
- Display total count of current participants

#### 3.2.3 Advertisement Management Panel
- Add advertisement content
- Upload advertisement image from device
- Uploaded images are stored in Supabase Storage
- Edit advertisement content
- Delete advertisement content
- Set advertisement display timing

#### 3.2.4 Broadcast Message Panel
- Compose broadcast message content
- Select message type (info, warning, etc.)
- Send broadcast message to all users
- View history of sent broadcast messages
- Display timestamp and message type for each historical message

#### 3.2.5 Leaderboard Management Page
- View current leaderboard
- Export leaderboard data
- Filter leaderboard by quiz session

#### 3.2.6 User List Management Page
- View list of registered users
- Display user details (Name, Surname, Mobile Number, Tehsil)
- Search and filter users

#### 3.2.7 Quiz History Page
- View past quiz sessions
- Display quiz session details (date, number of participants, questions)
- Access historical leaderboards

#### 3.2.8 Winners Display Configuration Panel
- Configure number of top winners to display on podium screen
- Set value between 1 and 10
- Default value is 5
- Save configuration for future quiz sessions

## 4. Business Rules and Logic

### 4.1 Mobile OTP Authentication Flow

**Login Flow:**
- User enters mobile number on Login Page
- System sends OTP via SMS to the mobile number
- User receives OTP and enters it on OTP Verification Page
- System verifies OTP
- Upon successful verification, user is logged in and can access quiz features

**Registration Flow:**
- User enters Name, Surname, Mobile Number, and selects Tehsil from dropdown on Registration Page
- System sends OTP via SMS to the mobile number
- User receives OTP and enters it on OTP Verification Page
- System verifies OTP
- Upon successful verification, user account is created and user is logged in

**OTP Verification Rules:**
- OTP consists of multiple digits entered in separate input boxes
- When user enters a digit, focus automatically advances to next input box
- When all digits are entered, OTP is automatically submitted for verification
- OTP expires after a defined period
- Countdown timer displays remaining time for OTP validity
- User can request OTP resend
- Resend option is disabled during countdown period after each send
- Countdown timer displays remaining time before resend is available

**Error Handling:**
- Invalid OTP: Display error message \"Invalid OTP. Please try again.\"
- Expired OTP: Display error message \"OTP has expired. Please request a new one.\"
- Network errors: Display error message \"Network error. Please check your connection and try again.\"

**UI/UX Requirements:**
- All authentication screens (Login, Registration, OTP Verification) are mobile-responsive
- NJMS logo and name are displayed prominently on all authentication screens
- Clean and attractive UI design consistent with NJMS branding

**Tehsil Dropdown:**
- Dropdown contains all tehsils in Nagpur district
- User must select one tehsil during registration

### 4.2 Quiz Scoring Rules
- Each question has a 15-second timer
- Users who answer correctly earn points
- Points awarded are inversely proportional to response time (faster answer = more points)
- Incorrect answers or timeout result in zero points for that question
- Total score is cumulative across all questions in the quiz session

### 4.3 Real-time Quiz Synchronization
- All users see the same question simultaneously during live quiz
- Question transitions are controlled by admin
- Leaderboard updates in real-time as users submit answers

### 4.4 Video Display
- Admin can show video content during quiz session
- Video is displayed to all users simultaneously

### 4.5 Broadcast Message Rules
- Admin composes and sends broadcast messages from Broadcast Message Panel
- Messages are delivered to all users in real-time
- Users see notification banner or toast when new broadcast arrives
- Messages can be marked with type (info, warning, etc.)
- Broadcast history is stored and viewable by admin

### 4.6 Advertisement Management Rules
- Admin uploads advertisement image from device via Advertisement Management Panel
- Uploaded images are stored in Supabase Storage
- Advertisement banner displays the uploaded image
- Admin can set display timing for each advertisement

### 4.7 Quiz Question Media Upload Rules
- When creating or editing a quiz question, admin selects question type
- For photo question type, admin can upload image file from device or enter image URL
- For video question type, admin can upload video file from device or enter video URL
- Uploaded media files are stored in Supabase Storage
- Quiz question displays the uploaded or linked media content

### 4.8 Pre-quiz Countdown Rules
- When quiz status is 'waiting', pre-quiz countdown is displayed to all participants
- Countdown includes animated timer
- Visual effects are shown during countdown
- Background audio plays during countdown
- Countdown is synchronized across all participants
- When countdown completes, quiz status changes to 'active' and first question is displayed

### 4.9 Participants Panel Rules
- Participants Panel displays all users currently joined in quiz session
- Panel updates in real-time as users join or leave
- Each participant entry shows Name, Surname, Tehsil, Phone Number
- Total participant count is displayed
- Panel is accessible to admin during quiz session

### 4.10 Top Winners Display Rules
- When quiz status changes to 'ended', Top Winners Podium Screen is displayed to all participants
- Number of winners displayed is configurable by admin (1-10, default 5)
- Winners are ranked by score (highest to lowest)
- Each winner entry shows Name, Surname, Tehsil, Score
- Celebratory visual effects are displayed
- Users can navigate to full leaderboard from podium screen

### 4.11 Full Leaderboard Display Rules
- After quiz ends, full leaderboard shows all participants ranked by score
- User's own position is highlighted
- Each entry shows Name, Surname, Tehsil, Score, Rank
- Leaderboard is accessible from Top Winners Podium Screen

### 4.12 Winners Configuration Rules
- Admin configures number of top winners via Winners Display Configuration Panel
- Value must be between 1 and 10
- Default value is 5
- Configuration is saved and applied to future quiz sessions

### 4.13 Data Storage
- User registration data (Name, Surname, Mobile Number, Tehsil) is stored in backend
- Quiz answers and scores are stored in backend
- Leaderboard data is stored and retrievable
- Quiz history is stored for future reference
- Broadcast messages and their metadata are stored in backend
- Advertisement images are stored in Supabase Storage
- Quiz question media files (photos and videos) are stored in Supabase Storage
- Participants list for each quiz session is stored in backend
- Winners display configuration is stored in backend

## 5. Exceptions and Boundary Cases

| Scenario | Handling |
|----------|----------|
| User does not receive OTP | Allow user to request OTP resend after countdown expires |
| User enters invalid OTP | Display error message \"Invalid OTP. Please try again.\" |
| OTP expires before user enters it | Display error message \"OTP has expired. Please request a new one.\" |
| Network error during OTP request | Display error message \"Network error. Please check your connection and try again.\" |
| Network error during OTP verification | Display error message \"Network error. Please check your connection and try again.\" |
| User requests OTP resend during countdown | Resend button is disabled, countdown timer is displayed |
| User submits answer after timer expires | Answer is not accepted, zero points awarded |
| Network disconnection during quiz | User is disconnected from live quiz session |
| Multiple users with same score | Rank by submission time (earlier submission ranks higher) |
| Admin stops quiz mid-session | Quiz session ends, final leaderboard is displayed |
| No users participate in quiz | Quiz can still be started and controlled by admin |
| Export leaderboard with no data | Export empty file or show notification |
| User is offline when broadcast message is sent | Message is not delivered to that user |
| Admin sends empty broadcast message | Message is not sent, show validation error |
| Multiple broadcast messages sent in quick succession | All messages are queued and displayed to users sequentially |
| User does not select Tehsil during registration | Registration cannot be submitted, show validation error |
| Mobile number is already registered | Display error message \"Mobile number already registered. Please log in.\" |
| Admin uploads advertisement image with unsupported format | Display error message and prevent upload |
| Advertisement image upload fails | Display error message and allow retry |
| Admin creates photo/video question without uploading or entering URL | Display validation error |
| Media file upload fails during question creation | Display error message and allow retry |
| Uploaded media file exceeds storage limit | Display error message and prevent upload |
| User joins quiz after countdown has started | User sees remaining countdown time |
| User joins quiz after countdown has ended | User sees current question directly |
| Network disconnection during countdown | User is disconnected, must rejoin to see quiz |
| Audio fails to play during countdown | Countdown continues without audio |
| No participants join quiz session | Participants Panel shows zero count |
| Participant leaves during quiz | Participants Panel updates to remove participant |
| Admin sets winners count to invalid value (less than 1 or greater than 10) | Display validation error and prevent save |
| Fewer participants than configured winners count | Display all participants on podium screen |
| Quiz ends with no participants | Top Winners Podium Screen shows no winners |
| User's own rank is outside top winners | User sees top winners podium, then can view full leaderboard to find own position |

## 6. Acceptance Criteria

1. User opens Login Page and enters mobile number
2. User receives OTP via SMS
3. User enters OTP on OTP Verification Page with auto-advance between digit boxes
4. OTP is auto-submitted when all digits are entered, and user is successfully logged in
5. User joins quiz session and sees pre-quiz countdown with animated timer, visual effects, and background audio
6. Admin views Participants Panel and sees user's Name, Surname, Tehsil, Phone Number in real-time list
7. Countdown completes and user sees first question with 15-second timer
8. User selects and submits answer before timer expires
9. User's score is calculated based on correctness and response time
10. Admin ends quiz session from Quiz Control Panel
11. User sees Top Winners Podium Screen displaying top 5 winners with celebratory effects
12. User navigates to full leaderboard and sees own position highlighted among all participants
13. Admin configures winners display count to 3 via Winners Display Configuration Panel
14. In next quiz session, Top Winners Podium Screen displays top 3 winners

## 7. Out of Scope for Current Release

- Multi-language support
- User profile editing after registration
- Password-based authentication for users
- Push notifications for quiz start reminders
- Social sharing of leaderboard results
- User-to-user chat or messaging
- Mobile native app versions (iOS/Android)
- Offline quiz mode
- Quiz categories or difficulty levels
- User badges or achievements system
- Payment or subscription features
- Broadcast message scheduling or delayed sending
- User-specific targeted messages
- Broadcast message read receipts or acknowledgment tracking
- Biometric authentication
- Two-factor authentication beyond OTP
- OTP delivery via email or other channels
- Advertisement video upload
- Bulk advertisement upload
- Advertisement analytics or click tracking
- Media file compression or optimization
- Media file preview before upload
- Drag-and-drop file upload interface
- Customizable countdown duration
- Customizable countdown visual themes
- Customizable celebration effects on podium screen
- Export participants list
- Filter or search participants in Participants Panel
- Historical participants data for past quiz sessions
- Participant attendance analytics