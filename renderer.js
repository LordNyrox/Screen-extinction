let profiles = {};

document.addEventListener('DOMContentLoaded', () => {
  loadProfiles();
  displayScreens();

  const saveProfileButton = document.getElementById('save-profile');
  saveProfileButton.addEventListener('click', saveProfile);
});

function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.innerText = message;
  errorDiv.style.display = 'block';

  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000); // Hide after 5 seconds
}

async function getMonitorInfo() {
  try {
    const command = 'powershell -command "Get-PnpDevice -Class Monitor | ConvertTo-Json"';
    const { stdout } = await window.api.runCommand(command);

    if (!stdout || !stdout.trim()) {
      return [];
    }

    const trimmedOutput = stdout.trim();
    if (trimmedOutput.startsWith('[')) {
      return JSON.parse(trimmedOutput);
    } else {
      return [JSON.parse(trimmedOutput)];
    }
  } catch (error) {
    console.error('Error getting monitor info:', error);
    showError('Failed to get monitor information. Please ensure PowerShell is working correctly.');
    return [];
  }
}

async function displayScreens() {
  const monitors = await getMonitorInfo();
  const screensDiv = document.getElementById('screens');
  screensDiv.innerHTML = ''; // Clear previous list

  if (!monitors || monitors.length === 0) {
      screensDiv.innerHTML = '<p>No monitors found or could not retrieve monitor information.</p>';
      return;
  }

  monitors.forEach(monitor => {
    const screenDiv = document.createElement('div');
    screenDiv.classList.add('screen');
    const isEnabled = monitor.Status === 'OK';
    screenDiv.innerHTML = `
      <h3>${monitor.FriendlyName}</h3>
      <ul>
        <li><strong>InstanceId:</strong> ${monitor.InstanceId}</li>
        <li><strong>Status:</strong> ${monitor.Status}</li>
      </ul>
      <button onclick="toggleScreen('${monitor.InstanceId}', ${!isEnabled})">${isEnabled ? 'Disable' : 'Enable'}</button>
    `;
    screensDiv.appendChild(screenDiv);
  });
}

async function toggleScreen(instanceId, enable) {
  const action = enable ? 'Enable-PnpDevice' : 'Disable-PnpDevice';
  const command = `powershell -command "${action} -InstanceId '${instanceId}' -Confirm:$false"`;

  try {
    await window.api.runCommand(command);
    setTimeout(displayScreens, 1000);
  } catch (error) {
    console.error(`Error toggling screen ${instanceId}:`, error);
    showError(`Failed to ${enable ? 'enable' : 'disable'} screen. This usually requires administrator rights. Please try running the application as an administrator.`);
  }
}


async function saveProfile() {
  const profileNameInput = document.getElementById('profile-name');
  const profileName = profileNameInput.value;
  if (!profileName) {
    alert('Please enter a profile name.');
    return;
  }

  const monitors = await getMonitorInfo();
  const screenStatus = {};
  monitors.forEach(monitor => {
    screenStatus[monitor.InstanceId] = monitor.Status === 'OK';
  });

  profiles[profileName] = screenStatus;
  await window.api.saveProfiles(profiles);
  profileNameInput.value = '';
  loadProfiles(); // Refresh profile list
}

async function loadProfiles() {
  try {
    profiles = await window.api.loadProfiles();
    const profileListDiv = document.getElementById('profile-list');
    profileListDiv.innerHTML = '';
    for (const profileName in profiles) {
      const profileDiv = document.createElement('div');
      profileDiv.classList.add('profile-item');
      profileDiv.innerHTML = `
        <span>${profileName}</span>
        <button onclick="applyProfile('${profileName}')">Load</button>
        <button onclick="deleteProfile('${profileName}')">Delete</button>
      `;
      profileListDiv.appendChild(profileDiv);
    }
  } catch (error) {
      showError('Failed to load profiles.');
  }
}

async function applyProfile(profileName) {
  const profile = profiles[profileName];
  if (!profile) return;

  for (const instanceId in profile) {
    await toggleScreen(instanceId, profile[instanceId]);
  }
}

async function deleteProfile(profileName) {
    if (confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
        delete profiles[profileName];
        await window.api.saveProfiles(profiles);
        loadProfiles();
    }
}
